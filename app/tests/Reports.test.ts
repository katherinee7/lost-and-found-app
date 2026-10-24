import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
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

test("saved records are private, session-owned, persistent, and excluded from owner search", async () => {
  const finder = await account("finder");
  const owner = await account("owner");
  const { report: found } = await post("/reports/create", {
    session: finder.session, author: owner.user, kind: "found", title: "Found calculator", attributes,
  });
  expect(typeof found).toBe("string");
  const expected = { report: found, kind: "found", title: "Found calculator", attributes, open: true };
  expect((await post("/reports/list", { session: finder.session })).book.reports).toEqual([expected]);
  expect((await post("/reports/list", { session: owner.session, author: finder.user })).book.reports).toEqual([]);

  const { report: missing } = await post("/reports/create", {
    session: owner.session, kind: "missing", title: "Missing calculator", attributes,
  });
  const results = await post("/reports/search", { session: finder.session, attributes });
  expect(results.results.matches.map((r: { report: string }) => r.report)).toEqual([missing]);
  expect(results.results.matches[0]).not.toHaveProperty("attributes");
  expect(results.results.matches[0]).not.toHaveProperty("author");
  expect(results.results.matches[0]).not.toHaveProperty("brand");
  expect(results.results.matches[0]).not.toHaveProperty("colors");
  expect((await post("/messages/start", { session: owner.session, report: found })).error).toBe("NOT_FOUND");
  expect((await post("/reports/close", { session: owner.session, author: finder.user, report: found })).error).toBe("NOT_FOUND");
  expect((await post("/reports/list", { session: finder.session })).book.reports).toEqual([expected]);

  // Reassemble against the same DB, as after a restart.
  const application = assembleApplication(db);
  handler = createHttpHandler({ application, gateway: createGateway({ application }), policy });
  expect((await post("/reports/list", { session: finder.session })).book.reports).toEqual([expected]);
  expect(await post("/reports/close", { session: finder.session, report: found })).toEqual({ report: found });
  expect((await post("/reports/list", { session: finder.session })).book.reports).toEqual([{ ...expected, open: false }]);
  expect(await db.collection("matching.entries").findOne({ _id: found })).toBeNull();
});

test("P2 documents remain missing, searchable, contactable and closable", async () => {
  const owner = await account("owner");
  const finder = await account("finder");
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Legacy report", attributes });
  // Only this compatibility fixture bypasses actions to reproduce the old schema.
  await db.collection("itemreporting.reports").updateOne({ _id: report }, { $unset: { kind: "" } });
  expect((await post("/reports/list", { session: owner.session })).book.reports[0].kind).toBe("missing");
  expect((await post("/reports/search", { session: finder.session, attributes })).results.matches[0].report).toBe(report);
  expect(typeof (await post("/messages/start", { session: finder.session, report })).conversation).toBe("string");
  await post("/reports/close", { session: owner.session, report });
  expect((await post("/reports/search", { session: finder.session, attributes })).results.matches).toEqual([]);
});

test("invalid or unauthenticated requests cannot create, list or close records", async () => {
  const { session } = await account("finder");
  for (const changed of [{ kind: undefined }, { kind: "invalid" }, { title: " " }, { attributes: { ...attributes, end: "bad" } }]) {
    expect((await post("/reports/create", { session, kind: "found", title: "Found item", attributes, ...changed })).error).toBe("INVALID_REQUEST");
  }
  expect((await post("/reports/create", { session: "invented", kind: "found", title: "Found item", attributes })).error).toBe("UNAUTHORIZED");
  expect((await post("/reports/list", { session: "invented" })).error).toBe("UNAUTHORIZED");
  expect((await post("/reports/list", { session })).book.reports).toEqual([]);
  expect(await db.collection("matching.entries").countDocuments()).toBe(0);
  const { report } = await post("/reports/create", { session, kind: "found", title: "Found item", attributes });
  expect((await post("/reports/close", { session: "invented", report })).error).toBe("UNAUTHORIZED");
  expect((await post("/reports/list", { session })).book.reports[0].open).toBe(true);
});
