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

test("later matches are recomputed on each request and exclude closed, incompatible, and self-authored reports", async () => {
  const finder = await account("finder");
  const owner = await account("owner");
  const { report: found } = await post("/reports/create", {
    session: finder.session, kind: "found", title: "Found calculator", attributes,
  });
  const loadMatches = () => post("/reports/matches", { session: finder.session, report: found });
  expect((await loadMatches()).results.matches).toEqual([]);

  // The missing report appears only after the finder has already saved and loaded.
  const { report: later } = await post("/reports/create", {
    session: owner.session, kind: "missing", title: "Later calculator",
    attributes: { ...attributes, colors: [" BLACK "], brand: "casio", locations: ["library"] },
  });
  expect((await loadMatches()).results.matches).toEqual([
    { report: later, title: "Later calculator", category: attributes.category,
      start: attributes.start, end: attributes.end, locations: ["library"] },
  ]);
  const { report: self } = await post("/reports/create", {
    session: finder.session, kind: "missing", title: "My own calculator", attributes,
  });
  // Legacy self-authored reports must be excluded too.
  await db.collection("itemreporting.reports").updateOne({ _id: self }, { $unset: { kind: "" } });
  for (const changed of [
    { category: "Bags" }, { colors: ["red"] }, { brand: "Other" }, { locations: ["Gym"] },
    { start: "2026-10-25T10:00:00Z", end: "2026-10-25T14:00:00Z" },
  ]) {
    await post("/reports/create", { session: owner.session, kind: "missing", title: "Incompatible", attributes: { ...attributes, ...changed } });
  }
  const { report: closed } = await post("/reports/create", {
    session: owner.session, kind: "missing", title: "Closed", attributes,
  });
  await post("/reports/close", { session: owner.session, report: closed });
  await post("/reports/create", { session: owner.session, kind: "found", title: "Another found item", attributes });
  expect((await loadMatches()).results.matches.map((match: { report: string }) => match.report)).toEqual([later]);
  // Finder search shares the same exclusion and summary rules.
  expect((await post("/reports/search", { session: finder.session, attributes })).results.matches.map((match: { report: string }) => match.report)).toEqual([later]);
  expect(typeof (await post("/messages/start", { session: finder.session, report: later })).conversation).toBe("string");
  await post("/reports/close", { session: owner.session, report: later });
  expect((await loadMatches()).results.matches).toEqual([]);
});

test("only the author of an open found record can request its matches", async () => {
  const finder = await account("finder");
  const other = await account("other");
  const { report } = await post("/reports/create", { session: finder.session, kind: "found", title: "Private", attributes });
  expect((await post("/reports/matches", { session: other.session, author: finder.user, report, attributes })).error).toBe("NOT_FOUND");
  expect((await post("/reports/matches", { session: "invented", report })).error).toBe("UNAUTHORIZED");
  expect((await post("/reports/matches", { session: finder.session, report: "nonexistent" })).error).toBe("NOT_FOUND");
  expect((await post("/reports/matches", { session: finder.session, report: "" })).error).toBe("INVALID_REQUEST");
  const { report: missing } = await post("/reports/create", { session: finder.session, kind: "missing", title: "Missing", attributes });
  expect((await post("/reports/matches", { session: finder.session, report: missing })).error).toBe("NOT_FOUND");
  expect((await post("/reports/list", { session: finder.session })).book.reports.find((r: { report: string }) => r.report === report).open).toBe(true);
  await post("/reports/close", { session: finder.session, report });
  expect((await post("/reports/matches", { session: finder.session, report })).error).toBe("NOT_FOUND");
});

test("later matching uses stored found attributes and includes legacy missing reports", async () => {
  const finder = await account("finder");
  const owner = await account("owner");
  const { report } = await post("/reports/create", { session: finder.session, kind: "found", title: "Found", attributes });
  const { report: missing } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Legacy", attributes });
  await db.collection("itemreporting.reports").updateOne({ _id: missing }, { $unset: { kind: "" } });
  const response = await post("/reports/matches", {
    session: finder.session, report, attributes: { ...attributes, category: "Bags" },
  });
  expect(response.results.matches).toEqual([
    { report: missing, title: "Legacy", category: attributes.category,
      start: attributes.start, end: attributes.end, locations: attributes.locations },
  ]);
});

test("editing missing reports updates search and saved-found matches before responding", async () => {
  const owner = await account("owner");
  const finder = await account("finder");
  const { report: found } = await post("/reports/create", { session: finder.session, kind: "found", title: "Found", attributes });
  const { report } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Wrong color", attributes: { ...attributes, colors: ["red"] } });
  const search = () => post("/reports/search", { session: finder.session, attributes });
  const matches = () => post("/reports/matches", { session: finder.session, report: found });
  expect((await search()).results.matches).toEqual([]);
  expect((await matches()).results.matches).toEqual([]);
  // Also exercise editing existing P2 documents without a stored kind.
  await db.collection("itemreporting.reports").updateOne({ _id: report }, { $unset: { kind: "" } });
  expect(await post("/reports/update", { session: owner.session, report, title: "Corrected calculator", attributes })).toEqual({ report });
  const expected = [{ report, title: "Corrected calculator", category: attributes.category, start: attributes.start, end: attributes.end, locations: attributes.locations }];
  expect((await search()).results.matches).toEqual(expected);
  expect((await matches()).results.matches).toEqual(expected);
  expect((await post("/reports/list", { session: owner.session })).book.reports[0].kind).toBe("missing");
  const changed = { ...attributes, locations: ["Gym"] };
  await post("/reports/update", { session: owner.session, report, title: "Moved location", attributes: changed });
  expect((await search()).results.matches).toEqual([]);
  expect((await matches()).results.matches).toEqual([]);
  expect((await db.collection("matching.entries").findOne({ _id: report }))?.attributes).toEqual(changed);
});

test("editing found records adds and removes current potential matches", async () => {
  const owner = await account("owner");
  const finder = await account("finder");
  const { report: missing } = await post("/reports/create", { session: owner.session, kind: "missing", title: "Missing", attributes });
  const { report } = await post("/reports/create", { session: finder.session, kind: "found", title: "Found", attributes: { ...attributes, brand: "Other" } });
  const matches = () => post("/reports/matches", { session: finder.session, report });
  expect((await matches()).results.matches).toEqual([]);
  await post("/reports/update", { session: finder.session, report, title: "Updated found", attributes, kind: "missing", author: owner.user, open: false });
  expect((await matches()).results.matches.map((r: { report: string }) => r.report)).toEqual([missing]);
  expect((await post("/reports/list", { session: finder.session })).book.reports).toEqual([
    { report, kind: "found", title: "Updated found", attributes, open: true },
  ]);
  expect((await db.collection("matching.entries").findOne({ _id: report }))?.attributes).toEqual(attributes);
  await post("/reports/update", { session: finder.session, report, title: "Updated again", attributes: { ...attributes, colors: ["red"] } });
  expect((await matches()).results.matches).toEqual([]);
});

test("unauthorized, invalid, and closed edits leave reporting and matching unchanged", async () => {
  const owner = await account("owner");
  const stranger = await account("stranger");
  for (const kind of ["missing", "found"]) {
    const { report } = await post("/reports/create", { session: owner.session, kind, title: "Original", attributes });
    const originalReport = await db.collection("itemreporting.reports").findOne({ _id: report });
    const originalEntry = await db.collection("matching.entries").findOne({ _id: report });
    const edit = { session: owner.session, report, title: "Edited", attributes: { ...attributes, colors: ["red"] } };
    for (const changed of [{ title: " " }, { title: "x".repeat(121) }, { attributes: { ...attributes, end: "bad" } }, { attributes: { ...attributes, colors: [""] } }]) {
      expect((await post("/reports/update", { ...edit, ...changed })).error).toBe("INVALID_REQUEST");
      expect(await db.collection("itemreporting.reports").findOne({ _id: report })).toEqual(originalReport);
      expect(await db.collection("matching.entries").findOne({ _id: report })).toEqual(originalEntry);
    }
    expect((await post("/reports/update", { ...edit, session: stranger.session, author: owner.user })).error).toBe("NOT_FOUND");
    expect((await post("/reports/update", { ...edit, session: "invented" })).error).toBe("UNAUTHORIZED");
    expect((await post("/reports/update", { ...edit, report: "unknown" })).error).toBe("NOT_FOUND");
    expect(await db.collection("itemreporting.reports").findOne({ _id: report })).toEqual(originalReport);
    expect(await db.collection("matching.entries").findOne({ _id: report })).toEqual(originalEntry);
    await post("/reports/close", { session: owner.session, report });
    const closed = await db.collection("itemreporting.reports").findOne({ _id: report });
    expect((await post("/reports/update", edit)).error).toBe("NOT_FOUND");
    expect(await db.collection("itemreporting.reports").findOne({ _id: report })).toEqual(closed);
    expect(await db.collection("matching.entries").findOne({ _id: report })).toBeNull();
  }
});
