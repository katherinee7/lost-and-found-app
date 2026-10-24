import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { MessagingConcept } from "../src/concepts/Messaging.ts";
import { policy } from "../src/http-policy.ts";

const client = new MongoClient(process.env.MONGODB_URL!);
const db = client.db(`backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`);
let handler: (request: Request) => Promise<Response>;
const attributes = {
  category: "Electronics", colors: ["black"], brand: "Casio",
  start: "2026-10-24T10:00:00Z", end: "2026-10-24T14:00:00Z", locations: ["Library"],
};

beforeAll(async () => { await client.connect(); });
beforeEach(async () => {
  await db.dropDatabase();
  const application = assembleApplication(db);
  handler = createHttpHandler({ application, gateway: createGateway({ application }), policy });
});
afterAll(async () => { try { await db.dropDatabase(); } finally { await client.close(); } });

async function post(path: string, body: object) {
  const response = await handler(new Request(`http://localhost/api${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  return response.json();
}
async function account(username: string) {
  const { user } = await post("/auth/register", { username, password: "test-password-123" });
  const { session } = await post("/auth/login", { username, password: "test-password-123" });
  expect(typeof session).toBe("string");
  return { user, session };
}

test("repeated and simultaneous contact reuses exactly one conversation per finder/report", async () => {
  const finder = await account("finder");
  const owner = await account("owner");
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Calculator", attributes });
  // Simulate separate server processes, not only one in-memory application.
  const secondApplication = assembleApplication(db);
  const secondHandler = createHttpHandler({ application: secondApplication, gateway: createGateway({ application: secondApplication }), policy });
  const starts = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
    const response = await (index % 2 ? handler : secondHandler)(new Request("http://localhost/api/messages/start", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: finder.session, report }),
    }));
    return response.json();
  }));
  for (const start of starts) expect(typeof start.conversation).toBe("string");
  expect(new Set(starts.map((start) => start.conversation)).size).toBe(1);
  const { conversation } = starts[0];
  expect(await db.collection("messaging.conversations").countDocuments()).toBe(1);
  expect(await db.collection("conversationlinking.links").countDocuments()).toBe(1);
  await post("/messages/send", { session: finder.session, conversation, text: "Hello" });
  expect(await post("/messages/start", { session: finder.session, report })).toEqual({ conversation });
  expect((await post("/messages/read", { session: owner.session, conversation })).messages[0].text).toBe("Hello");
  const { report: different } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Another calculator", attributes });
  expect((await post("/messages/start", { session: finder.session, report: different })).conversation).not.toBe(conversation);
  const otherFinder = await account("otherfinder");
  expect((await post("/messages/start", { session: otherFinder.session, report })).conversation).not.toBe(conversation);
  expect(await db.collection("messaging.conversations").countDocuments()).toBe(3);
});

test("labels show current report title and other username and messaging survives closure", async () => {
  const finder = await account("finder");
  const owner = await account("owner");
  const stranger = await account("stranger");
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Calculator", attributes });
  const { conversation } = await post("/messages/start", { session: finder.session, report });
  expect((await post("/messages/list", { session: finder.session })).book.conversations).toEqual([
    { conversation, other: owner.user, title: "Calculator", username: "owner" },
  ]);
  expect((await post("/messages/list", { session: owner.session })).book.conversations).toEqual([
    { conversation, other: finder.user, title: "Calculator", username: "finder" },
  ]);
  expect((await post("/messages/list", { session: stranger.session, user: owner.user })).book.conversations).toEqual([]);
  expect((await post("/messages/read", { session: stranger.session, user: owner.user, conversation })).error).toBe("NOT_FOUND");
  expect((await post("/messages/send", { session: stranger.session, sender: owner.user, conversation, text: "Intrusion" })).error).toBe("NOT_FOUND");
  expect((await post("/messages/read", { session: owner.session, conversation })).messages).toEqual([]);
  await post("/reports/update", { session: owner.session, report, title: "Casio calculator", attributes });
  expect((await post("/messages/list", { session: finder.session })).book.conversations[0].title).toBe("Casio calculator");
  await post("/reports/close", { session: owner.session, report });
  const application = assembleApplication(db);
  handler = createHttpHandler({ application, gateway: createGateway({ application }), policy });
  expect((await post("/messages/list", { session: finder.session })).book.conversations).toEqual([
    { conversation, other: owner.user, title: "Casio calculator", username: "owner" },
  ]);
  await post("/messages/send", { session: finder.session, conversation, text: "Did you get it?" });
  await post("/messages/send", { session: owner.session, conversation, text: "Yes, thanks!" });
  expect((await post("/messages/read", { session: finder.session, conversation })).messages.map((m: { text: string }) => m.text)).toEqual(["Did you get it?", "Yes, thanks!"]);
  expect((await post("/messages/start", { session: finder.session, report })).error).toBe("NOT_FOUND");
});

test("legacy unlinked conversations remain listed with a username and readable messages", async () => {
  const owner = await account("owner");
  const finder = await account("finder");
  const messaging = new MessagingConcept(db);
  const { conversation } = await messaging.create({ first: owner.user, second: finder.user });
  await messaging.send({ sender: owner.user, conversation, text: "An earlier message" });
  expect((await post("/messages/list", { session: finder.session })).book.conversations).toEqual([
    { conversation, other: owner.user, title: null, username: "owner" },
  ]);
  expect((await post("/messages/read", { session: finder.session, conversation })).messages[0].text).toBe("An earlier message");
});

test("invalid contact targets and unknown sessions never reserve links or create conversations", async () => {
  const owner = await account("owner");
  const finder = await account("finder");
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Private", attributes });
  expect((await post("/messages/start", { session: owner.session, report })).error).toBe("NOT_FOUND");
  expect((await post("/messages/start", { session: "invented", report })).error).toBe("UNAUTHORIZED");
  expect((await post("/messages/start", { session: finder.session, report: "unknown" })).error).toBe("NOT_FOUND");
  const { report: found } = await post("/reports/create", { session: owner.session, kind: "found", title: "Found", attributes });
  expect((await post("/messages/start", { session: finder.session, report: found })).error).toBe("NOT_FOUND");
  await post("/reports/close", { session: owner.session, report });
  expect((await post("/messages/start", { session: finder.session, report })).error).toBe("NOT_FOUND");
  expect(await db.collection("conversationlinking.links").countDocuments()).toBe(0);
  expect(await db.collection("messaging.conversations").countDocuments()).toBe(0);
});
