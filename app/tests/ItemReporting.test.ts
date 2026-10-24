import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  test,
} from "bun:test";
import { MongoClient } from "mongodb";
import {
  ItemReportingConcept,
  InvalidReport,
  ReportUnavailable,
} from "../src/concepts/ItemReporting.ts";

const url = process.env.MONGODB_URL;
if (!url) throw new Error("MONGODB_URL is missing.");

const client = new MongoClient(url);
const db = client.db(
  `backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`,
);

const reporting = new ItemReportingConcept(db);

const attributes = {
  category: "Electronics",
  colors: ["black"],
  brand: "Casio",
  start: "2026-10-18T10:00:00Z",
  end: "2026-10-18T14:00:00Z",
  locations: ["Library"],
};

beforeAll(async () => {
  await client.connect();
});

beforeEach(async () => {
  await db.dropDatabase();
});

afterAll(async () => {
  try {
    await db.dropDatabase();
  } finally {
    await client.close();
  }
});

test("creates a report that persists across instances", async () => {
  const { report } = await reporting.create({
    author: "alex",
    title: "Missing calculator",
    kind: "missing",
    attributes,
  });

  const anotherInstance = new ItemReportingConcept(db);
  const own = await anotherInstance._own({ author: "alex" });

  expect(own).toContainEqual({
    report,
    title: "Missing calculator",
    kind: "missing",
    attributes,
    open: true,
  });
});

test("another user cannot list or close the report", async () => {
  const { report } = await reporting.create({
    author: "owner",
    title: "Private report",
    kind: "missing",
    attributes,
  });

  expect(await reporting._own({ author: "stranger" }))
    .toEqual([]);

  await expect(
    reporting.close({ author: "stranger", report }),
  ).rejects.toBeInstanceOf(ReportUnavailable);

  const own = await reporting._own({ author: "owner" });
  expect(own.find((entry) => entry.report === report)?.open)
    .toBe(true);
});

test("the author can close their report", async () => {
  const { report } = await reporting.create({
    author: "maya",
    title: "Missing headphones",
    kind: "missing",
    attributes,
  });

  await reporting.close({ author: "maya", report });

  const own = await reporting._own({ author: "maya" });
  expect(own.find((entry) => entry.report === report)?.open)
    .toBe(false);
});

test("rejects invalid report fields", async () => {
  for (const input of [
    { title: "", attributes },
    {
      title: "Calculator",
      attributes: { ...attributes, category: "Invalid category" },
    },
    {
      title: "Calculator",
      attributes: { ...attributes, end: "2026-10-17T10:00:00Z" },
    },
  ]) {
    await expect(
      reporting.create({ author: "alex", kind: "missing", ...input }),
    ).rejects.toBeInstanceOf(InvalidReport);
  }
});


test("found records persist privately and only their author can close them", async () => {
  const { report } = await reporting.create({ author: "finder", kind: "found", title: "Found calculator", attributes });
  const restarted = new ItemReportingConcept(db);
  expect(await restarted._own({ author: "finder" })).toEqual([
    { report, kind: "found", title: "Found calculator", attributes, open: true },
  ]);
  expect(await reporting._own({ author: "stranger" })).toEqual([]);
  expect(await reporting._summary({ report })).toEqual([]);
  await expect(reporting.contactTarget({ requester: "stranger", report })).rejects.toBeInstanceOf(ReportUnavailable);
  await expect(reporting.close({ author: "stranger", report })).rejects.toBeInstanceOf(ReportUnavailable);
  expect((await reporting._own({ author: "finder" }))[0]?.open).toBe(true);
  await reporting.close({ author: "finder", report });
  await reporting.close({ author: "finder", report }); // Closing is idempotent.
  expect(await reporting._own({ author: "finder" })).toEqual([
    { report, kind: "found", title: "Found calculator", attributes, open: false },
  ]);
});

test("legacy documents without kind behave as missing without a migration", async () => {
  const { report } = await reporting.create({ author: "owner", kind: "missing", title: "Old calculator", attributes });
  // Simulate the persisted P2 schema; all other fixture data comes from actions.
  await db.collection("itemreporting.reports").updateOne({ _id: report }, { $unset: { kind: "" } });
  expect((await reporting._own({ author: "owner" }))[0]?.kind).toBe("missing");
  expect(await reporting._summary({ report })).toHaveLength(1);
  expect(await reporting.contactTarget({ requester: "finder", report })).toEqual({ owner: "owner" });
  await expect(reporting.contactTarget({ requester: "owner", report })).rejects.toBeInstanceOf(ReportUnavailable);
  await reporting.close({ author: "owner", report });
  expect(await reporting._summary({ report })).toEqual([]);
  await expect(reporting.contactTarget({ requester: "finder", report })).rejects.toBeInstanceOf(ReportUnavailable);
  expect((await reporting._own({ author: "owner" }))[0]?.kind).toBe("missing");
});

test("invalid kinds and found record fields leave no records", async () => {
  await expect(reporting.create({ author: "finder", kind: "other" as "found", title: "Found item", attributes })).rejects.toBeInstanceOf(InvalidReport);
  await expect(reporting.create({ author: "finder", kind: "found", title: " ", attributes })).rejects.toBeInstanceOf(InvalidReport);
  await expect(reporting.create({ author: "finder", kind: "found", title: "Found item", attributes: { ...attributes, end: "bad" } })).rejects.toBeInstanceOf(InvalidReport);
  expect(await reporting._own({ author: "finder" })).toEqual([]);
});
