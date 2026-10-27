import { afterAll, beforeAll, beforeEach, expect, test, spyOn } from "bun:test";
import { MongoClient } from "mongodb";
import { ContributionRewardingConcept, ContributionConflict, ContributionUnavailable, InvalidContribution } from "../src/concepts/ContributionRewarding.ts";
const client = new MongoClient(process.env.MONGODB_URL!);
const db = client.db(`backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`);
let rewarding: ContributionRewardingConcept;
const pair = { contribution: "item", contributor: "finder", recipient: "owner" };
beforeAll(async () => { await client.connect(); });
beforeEach(async () => { await db.dropDatabase(); rewarding = new ContributionRewardingConcept(db); });
afterAll(async () => { try { await db.dropDatabase(); } finally { await client.close(); } });

test("register, confirm twice, and retain exactly one point across instances", async () => {
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 0 });
  expect((await rewarding.status({ user: "owner", ...pair })).status.registered).toBe(false);
  await rewarding.register({ user: "owner", ...pair });
  const first = await rewarding.confirm({ user: "owner", contribution: "item", contributor: "finder" });
  expect(first.status).toEqual({ registered: true, contributorConfirmed: false, recipientConfirmed: true, rewarded: false, role: "recipient" });
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 0 });
  const second = await rewarding.confirm({ user: "finder", contribution: "item", contributor: "finder" });
  expect(second.status.rewarded).toBe(true);
  const restarted = new ContributionRewardingConcept(db);
  expect(await restarted.balance({ user: "finder" })).toEqual({ points: 1 });
  expect(await restarted.balance({ user: "owner" })).toEqual({ points: 0 });
  expect((await restarted.status({ user: "finder", ...pair })).status).toEqual(second.status);
  await restarted.register({ user: "owner", ...pair });
  await restarted.confirm({ user: "finder", contribution: "item", contributor: "finder" });
  expect(await restarted.balance({ user: "finder" })).toEqual({ points: 1 });
});

test("simultaneous registration and confirmation across instances cannot duplicate awards", async () => {
  const instances = Array.from({ length: 10 }, () => new ContributionRewardingConcept(db));
  await Promise.all(instances.map(instance => instance.register({ user: "owner", ...pair })));
  await Promise.all(instances.map((instance, i) => instance.confirm({ user: i % 2 ? "owner" : "finder", contribution: "item", contributor: "finder" })));
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 1 });
  expect(await db.collection("contributionrewarding.entries").countDocuments()).toBe(1);
});

test("outsiders, self rewards, missing registrations and replacement finders change nothing", async () => {
  await expect(rewarding.register({ user: "owner", ...pair, contributor: "owner" })).rejects.toBeInstanceOf(InvalidContribution);
  await expect(rewarding.register({ user: "finder", ...pair })).rejects.toBeInstanceOf(ContributionUnavailable);
  await expect(rewarding.confirm({ user: "owner", contribution: "item", contributor: "finder" })).rejects.toBeInstanceOf(ContributionUnavailable);
  expect(await db.collection("contributionrewarding.entries").countDocuments()).toBe(0);
  await rewarding.register({ user: "owner", ...pair });
  const original = await rewarding.status({ user: "owner", ...pair });
  await expect(rewarding.register({ user: "owner", ...pair, contributor: "different" })).rejects.toBeInstanceOf(ContributionConflict);
  await expect(rewarding.confirm({ user: "outsider", contribution: "item", contributor: "finder" })).rejects.toBeInstanceOf(ContributionUnavailable);
  await expect(rewarding.confirm({ user: "owner", contribution: "item", contributor: "different" })).rejects.toBeInstanceOf(ContributionUnavailable);
  await expect(rewarding.status({ user: "outsider", ...pair })).rejects.toBeInstanceOf(ContributionUnavailable);
  await expect(rewarding.status({ user: "owner", ...pair, contributor: "different" })).rejects.toBeInstanceOf(ContributionConflict);
  expect(await rewarding.status({ user: "owner", ...pair })).toEqual(original);
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 0 });
});

test("competing contributors cannot replace the first registration", async () => {
  const candidates = ["finder", "other-finder"];
  const outcomes = await Promise.allSettled(candidates.map(contributor =>
    new ContributionRewardingConcept(db).register({ user: "owner", ...pair, contributor })));
  expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  const rejected = outcomes.find(result => result.status === "rejected");
  expect(rejected && rejected.status === "rejected" && rejected.reason instanceof ContributionConflict).toBe(true);
  const winner = candidates[outcomes.findIndex(result => result.status === "fulfilled")]!;
  await rewarding.confirm({ user: "owner", contribution: "item", contributor: winner });
  await rewarding.confirm({ user: winner, contribution: "item", contributor: winner });
  expect(await rewarding.balance({ user: winner })).toEqual({ points: 1 });
  expect(await rewarding.balance({ user: candidates.find(value => value !== winner)! })).toEqual({ points: 0 });
});

test("either participant acknowledges once, in either order, without a registration step", async () => {
  for (const first of ["owner", "finder"]) {
    const context = { ...pair, contribution: first };
    const second = first === "owner" ? "finder" : "owner";
    expect((await rewarding.acknowledge({ user: first, ...context })).rewarded).toBe(false);
    expect((await new ContributionRewardingConcept(db).status({ user: second, ...context })).status[first === "owner" ? "recipientConfirmed" : "contributorConfirmed"]).toBe(true);
    expect((await rewarding.acknowledge({ user: second, ...context })).rewarded).toBe(true);
    await rewarding.acknowledge({ user: first, ...context });
  }
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 2 });
});

test("finder intentions cannot reserve the recipient's choice and concurrent acknowledgements award once", async () => {
  await rewarding.acknowledge({ user: "other", ...pair, contributor: "other" });
  await Promise.all(Array.from({ length: 12 }, (_, i) => new ContributionRewardingConcept(db).acknowledge({ user: i % 2 ? "owner" : "finder", ...pair })));
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 1 });
  expect(await rewarding.balance({ user: "other" })).toEqual({ points: 0 });
  await expect(rewarding.acknowledge({ user: "other", ...pair, contributor: "other" })).rejects.toBeInstanceOf(ContributionConflict);
  await expect(rewarding.acknowledge({ user: "outsider", ...pair })).rejects.toBeInstanceOf(ContributionUnavailable);
  await expect(rewarding.acknowledge({ user: "owner", ...pair, contributor: "owner" })).rejects.toBeInstanceOf(InvalidContribution);
});


test("an interruption after recipient selection leaves confirmation pending and retryable", async () => {
  const register = rewarding.register.bind(rewarding);
  const spy = spyOn(rewarding, "register").mockImplementationOnce(async input => {
    await register(input);
    throw new Error("Interrupted after selection");
  });
  try {
    await expect(rewarding.acknowledge({ user: "owner", ...pair })).rejects.toThrow("Interrupted after selection");
  } finally { spy.mockRestore(); }
  expect((await rewarding.status({ user: "owner", ...pair })).status.recipientConfirmed).toBe(false);
  await rewarding.acknowledge({ user: "owner", ...pair });
  expect((await rewarding.acknowledge({ user: "finder", ...pair })).rewarded).toBe(true);
  expect(await rewarding.balance({ user: "finder" })).toEqual({ points: 1 });
});
