import {
  afterAll,
  beforeAll,
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
    attributes,
  });

  const anotherInstance = new ItemReportingConcept(db);
  const own = await anotherInstance._own({ author: "alex" });

  expect(own).toContainEqual({
    report,
    title: "Missing calculator",
    attributes,
    open: true,
  });
});

test("another user cannot list or close the report", async () => {
  const { report } = await reporting.create({
    author: "owner",
    title: "Private report",
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
      reporting.create({ author: "alex", ...input }),
    ).rejects.toBeInstanceOf(InvalidReport);
  }
});
