import { afterAll, beforeAll, beforeEach, expect, test, spyOn } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { ItemReportingConcept } from "../src/concepts/ItemReporting.ts";
import { MatchingConcept } from "../src/concepts/Matching.ts";
import { ConversationLinkingConcept } from "../src/concepts/ConversationLinking.ts";
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

async function journey() {
  const owner = await account("owner");
  const finder = await account("finder");
  const stranger = await account("stranger");
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Missing calculator", attributes });
  const { conversation } = await post("/messages/start", { session: finder.session, report, attributes });
  return { owner, finder, stranger, report, conversation };
}

test("joint confirmation gives one point and closes/removes only the missing report", async () => {
  const { owner, finder, report, conversation } = await journey();
  const { report: saved } = await post("/reports/create", { session: finder.session, kind: "found", title: "Saved calculator", attributes });
  const initial = await post("/returns/status", { session: owner.session, conversation });
  expect(initial.status).toEqual({ registered: false, contributorConfirmed: false, recipientConfirmed: false, rewarded: false, role: "recipient" });
  expect((await post("/returns/begin", { session: owner.session, conversation })).status.registered).toBe(true);
  expect((await post("/returns/confirm", { session: owner.session, conversation })).status.rewarded).toBe(false);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 0 });
  expect((await post("/reports/list", { session: owner.session })).book.reports[0].open).toBe(true);
  const completed = await post("/returns/confirm", { session: finder.session, conversation });
  expect(completed.status.rewarded).toBe(true);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
  expect(await post("/returns/balance", { session: owner.session, user: finder.user })).toEqual({ points: 0 });
  expect((await post("/reports/list", { session: owner.session })).book.reports[0].open).toBe(false);
  expect(await db.collection("matching.entries").findOne({ _id: report })).toBeNull();
  expect((await post("/reports/list", { session: finder.session })).book.reports.find((r: { report: string }) => r.report === saved).open).toBe(true);
  expect((await post("/reports/search", { session: finder.session, attributes })).results.matches).toEqual([]);
  const application = assembleApplication(db);
  handler = createHttpHandler({ application, gateway: createGateway({ application }), policy });
  expect((await post("/returns/status", { session: finder.session, conversation })).status.rewarded).toBe(true);
  await post("/returns/confirm", { session: finder.session, conversation });
  await post("/returns/begin", { session: owner.session, conversation });
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
});

test("outsiders, finders initiating, self-rewards and unlinked conversations cannot register rewards", async () => {
  const { owner, finder, stranger, report, conversation } = await journey();
  expect((await post("/returns/begin", { session: finder.session, conversation })).error).toBe("NOT_FOUND");
  for (const path of ["/returns/begin", "/returns/confirm", "/returns/status"]) {
    expect((await post(path, { session: stranger.session, conversation, user: owner.user })).error).toBe("NOT_FOUND");
    expect((await post(path, { session: "invented", conversation })).error).toBe("UNAUTHORIZED");
  }
  const messaging = new MessagingConcept(db);
  const legacy = await messaging.create({ first: owner.user, second: finder.user });
  expect((await post("/returns/begin", { session: owner.session, conversation: legacy.conversation })).error).toBe("NOT_FOUND");
  const selfLink = await new ConversationLinkingConcept(db).resolve({ initiator: owner.user, context: report });
  expect((await post("/returns/begin", { session: owner.session, conversation: selfLink.conversation })).error).toBe("NOT_FOUND");
  expect(await db.collection("contributionrewarding.entries").countDocuments()).toBe(0);
  // Extra IDs cannot redirect a legitimate owner request to another finder/report.
  await post("/returns/begin", { session: owner.session, conversation, contributor: stranger.user, recipient: stranger.user, report: "other" });
  expect((await db.collection("contributionrewarding.entries").findOne({ _id: report }))?.contributor).toBe(finder.user);
});

test("concurrent requests and different conversations cannot award twice or substitute finders", async () => {
  const { owner, finder, stranger, report, conversation } = await journey();
  const { conversation: other } = await post("/messages/start", { session: stranger.session, report, attributes });
  await Promise.all(Array.from({ length: 6 }, () => post("/returns/begin", { session: owner.session, conversation })));
  expect((await post("/returns/begin", { session: owner.session, conversation: other })).error).toBe("CONFLICT");
  expect((await post("/returns/status", { session: stranger.session, conversation: other })).error).toBe("CONFLICT");
  expect((await post("/returns/confirm", { session: owner.session, conversation: other })).error).toBe("CONFLICT");
  const application = assembleApplication(db);
  const otherHandler = createHttpHandler({ application, gateway: createGateway({ application }), policy });
  const results = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
    const response = await (i % 2 ? handler : otherHandler)(new Request("http://localhost/api/returns/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: i % 2 ? owner.session : finder.session, conversation }),
    }));
    return response.json();
  }));
  expect(results.every(r => !r.error && r.status.registered)).toBe(true);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
  expect(await post("/returns/balance", { session: stranger.session })).toEqual({ points: 0 });
  expect(await db.collection("contributionrewarding.entries").countDocuments()).toBe(1);
});

test("manual closure awards nothing but pending and late acknowledgements can complete", async () => {
  const { owner, finder, report, conversation } = await journey();
  await post("/returns/begin", { session: owner.session, conversation });
  await post("/returns/confirm", { session: finder.session, conversation });
  await post("/reports/close", { session: owner.session, report });
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 0 });
  expect((await post("/returns/confirm", { session: owner.session, conversation })).status.rewarded).toBe(true);
  const { report: another } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Another", attributes });
  const { conversation: later } = await post("/messages/start", { session: finder.session, report: another, attributes });
  await post("/reports/close", { session: owner.session, report: another });
  expect(await db.collection("contributionrewarding.entries").countDocuments()).toBe(1);
  await post("/returns/begin", { session: owner.session, conversation: later });
  await post("/returns/confirm", { session: owner.session, conversation: later });
  await post("/returns/confirm", { session: finder.session, conversation: later });
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 2 });
});

test("a failed close or matching removal after reward completion is repaired on the next status request", async () => {
  const { owner, finder, report, conversation } = await journey();
  await post("/returns/begin", { session: owner.session, conversation });
  await post("/returns/confirm", { session: owner.session, conversation });
  const closeSpy = spyOn(ItemReportingConcept.prototype, "close").mockRejectedValueOnce(new Error("Injected close failure"));
  try {
    const app = assembleApplication(db);
    const failing = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
    await failing(new Request("http://localhost/api/returns/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: finder.session, conversation }),
    }));
    expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
    expect((await db.collection("itemreporting.reports").findOne({ _id: report }))?.open).toBe(true);
  } finally { closeSpy.mockRestore(); }
  const removeSpy = spyOn(MatchingConcept.prototype, "remove").mockRejectedValueOnce(new Error("Injected remove failure"));
  try {
    const app = assembleApplication(db);
    const failing = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
    await failing(new Request("http://localhost/api/returns/status", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: finder.session, conversation }),
    }));
    expect((await db.collection("itemreporting.reports").findOne({ _id: report }))?.open).toBe(false);
    expect(await db.collection("matching.entries").findOne({ _id: report })).not.toBeNull();
  } finally { removeSpy.mockRestore(); }
  const app = assembleApplication(db);
  handler = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
  expect((await post("/returns/status", { session: finder.session, conversation })).status.rewarded).toBe(true);
  expect(await db.collection("matching.entries").findOne({ _id: report })).toBeNull();
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
});


test("two confirmations in either order close the missing and linked saved record, not unrelated items", async () => {
  const { owner, finder, stranger } = await journey();
  for (const first of [owner, finder]) {
    const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Two-click return", attributes });
    const { report: saved } = await post("/reports/create", { session: finder.session, kind: "found", title: "Linked found item", attributes });
    const { report: unrelated } = await post("/reports/create", { session: finder.session, kind: "found", title: "Unrelated found item", attributes });
    const { conversation } = await post("/messages/start-saved", { session: finder.session, report, foundReport: saved });
    const before = (await post("/returns/balance", { session: finder.session })).points;
    expect((await post("/returns/confirm", { session: first.session, conversation })).status.rewarded).toBe(false);
    expect((await post("/reports/list", { session: finder.session })).book.reports.find((r: { report: string }) => r.report === saved).open).toBe(true);
    const second = first === owner ? finder : owner;
    const app = assembleApplication(db);
    handler = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
    expect((await post("/returns/confirm", { session: second.session, conversation, foundReport: unrelated, contributor: stranger.user })).status.rewarded).toBe(true);
    expect((await post("/reports/list", { session: owner.session })).book.reports.find((r: { report: string }) => r.report === report).open).toBe(false);
    const own = (await post("/reports/list", { session: finder.session })).book.reports;
    expect(own.find((r: { report: string }) => r.report === saved).open).toBe(false);
    expect(own.find((r: { report: string }) => r.report === unrelated).open).toBe(true);
    expect(await db.collection("matching.entries").findOne({ _id: saved })).toBeNull();
    expect((await post("/returns/balance", { session: finder.session })).points).toBe(before + 1);
    await post("/returns/confirm", { session: first.session, conversation });
    expect((await post("/returns/balance", { session: finder.session })).points).toBe(before + 1);
  }
});

test("an early finder cannot block the owner confirming with another finder", async () => {
  const { owner, finder, stranger, report, conversation } = await journey();
  expect((await post("/returns/confirm", { session: finder.session, conversation })).status.contributorConfirmed).toBe(true);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 0 });
  const { conversation: other } = await post("/messages/start", { session: stranger.session, report, attributes });
  expect((await post("/returns/confirm", { session: owner.session, conversation: other })).status.recipientConfirmed).toBe(true);
  expect((await post("/returns/confirm", { session: stranger.session, conversation: other })).status.rewarded).toBe(true);
  expect(await post("/returns/balance", { session: stranger.session })).toEqual({ points: 1 });
  expect((await post("/returns/confirm", { session: owner.session, conversation })).error).toBe("CONFLICT");
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 0 });
});

test("saved-source authorization and retry after found-close failure", async () => {
  const { owner, finder, stranger, report, conversation } = await journey();
  const { report: saved } = await post("/reports/create", { session: finder.session, kind: "found", title: "Saved", attributes });
  const { report: other } = await post("/reports/create", { session: stranger.session, kind: "found", title: "Private", attributes });
  expect((await post("/messages/start-saved", { session: finder.session, report, foundReport: other })).error).toBe("NOT_FOUND");
  expect((await post("/messages/start-saved", { session: finder.session, report, foundReport: report })).error).toBe("NOT_FOUND");
  expect((await post("/messages/start-saved", { session: finder.session, report, foundReport: saved })).conversation).toBe(conversation);
  expect((await post("/messages/start-saved", { session: finder.session, report, foundReport: saved })).conversation).toBe(conversation);
  await post("/returns/confirm", { session: finder.session, conversation });
  const spy = spyOn(ItemReportingConcept.prototype, "closeFound").mockRejectedValueOnce(new Error("Injected found-close failure"));
  try {
    const app = assembleApplication(db);
    const failing = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
    await failing(new Request("http://localhost/api/returns/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: owner.session, conversation }) }));
    expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
    expect((await db.collection("itemreporting.reports").findOne({ _id: saved }))?.open).toBe(true);
  } finally { spy.mockRestore(); }
  const app = assembleApplication(db);
  handler = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
  expect((await post("/returns/status", { session: owner.session, conversation })).status.rewarded).toBe(true);
  expect((await db.collection("itemreporting.reports").findOne({ _id: saved }))?.open).toBe(false);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
});

test("simultaneous first confirmations across application instances need no initiation and award once", async () => {
  const { owner, finder, report, conversation } = await journey();
  const app = assembleApplication(db);
  const other = createHttpHandler({ application: app, gateway: createGateway({ application: app }), policy });
  const results = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
    const response = await (i % 2 ? handler : other)(new Request("http://localhost/api/returns/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: i % 2 ? owner.session : finder.session, conversation }),
    }));
    return response.json();
  }));
  expect(results.every(result => !result.error)).toBe(true);
  expect(await post("/returns/balance", { session: finder.session })).toEqual({ points: 1 });
  expect((await db.collection("itemreporting.reports").findOne({ _id: report }))?.open).toBe(false);
});
