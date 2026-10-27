import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { ConversationLinkingConcept, LinkUnavailable } from "../src/concepts/ConversationLinking.ts";

const client = new MongoClient(process.env.MONGODB_URL!);
const db = client.db(`backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`);
let linking: ConversationLinkingConcept;
beforeAll(async () => { await client.connect(); });
beforeEach(async () => { await db.dropDatabase(); linking = new ConversationLinkingConcept(db); });
afterAll(async () => { try { await db.dropDatabase(); } finally { await client.close(); } });

test("reserves and retrieves one identity per initiator/context across instances", async () => {
  const pair = { initiator: "finder", context: "report" };
  const result = await linking.resolve(pair);
  expect(typeof result.conversation).toBe("string");
  const another = new ConversationLinkingConcept(db);
  expect(await another.resolve(pair)).toEqual(result);
  expect(await another._context(result)).toEqual([{ context: "report" }]);
  expect(await linking._context({ conversation: "unlinked" })).toEqual([]);
  const otherReport = await linking.resolve({ ...pair, context: "other-report" });
  const otherFinder = await linking.resolve({ ...pair, initiator: "other-finder" });
  expect(new Set([result.conversation, otherReport.conversation, otherFinder.conversation]).size).toBe(3);
});

test("simultaneous resolutions across instances converge without duplicate links", async () => {
  const instances = Array.from({ length: 8 }, () => new ConversationLinkingConcept(db));
  const results = await Promise.all(instances.map((instance) => instance.resolve({ initiator: "finder", context: "report" })));
  expect(new Set(results.map((result) => result.conversation)).size).toBe(1);
  expect(await db.collection("conversationlinking.links").countDocuments()).toBe(1);
});

test("get returns a reserved context and initiator and rejects unlinked conversations", async () => {
  const { conversation } = await linking.resolve({ initiator: "finder", context: "report" });
  expect(await linking.get({ conversation })).toEqual({ initiator: "finder", context: "report" });
  await expect(linking.get({ conversation: "unknown" })).rejects.toBeInstanceOf(LinkUnavailable);
  expect(await linking._context({ conversation })).toEqual([{ context: "report" }]);
});

test("source association is optional, persistent, idempotent and cannot be replaced", async () => {
  const link = await linking.resolve({ initiator: "finder", context: "report" });
  expect(await linking.source(link)).toEqual({ hasSource: false, source: "" });
  await linking.attach({ ...link, source: "saved" });
  await linking.attach({ ...link, source: "saved" });
  expect(await new ConversationLinkingConcept(db).source(link)).toEqual({ hasSource: true, source: "saved" });
  await expect(linking.attach({ ...link, source: "different" })).rejects.toThrow();
  await expect(linking.attach({ conversation: "unknown", source: "saved" })).rejects.toThrow();
  expect(await linking.source(link)).toEqual({ hasSource: true, source: "saved" });
});
