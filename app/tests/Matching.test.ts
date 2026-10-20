import {
  afterAll,
  beforeAll,
  expect,
  test,
} from "bun:test";
import { MongoClient } from "mongodb";
import {
  MatchingConcept,
  InvalidMatchAttributes,
} from "../src/concepts/Matching.ts";

const url = process.env.MONGODB_URL;
if (!url) throw new Error("MONGODB_URL is missing.");

const client = new MongoClient(url);
const db = client.db(
  `backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`,
);

const matching = new MatchingConcept(db);

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

test("matches compatible records and normalizes text", async () => {
  await matching.register({
    record: "calculator",
    attributes,
  });

  const results = await matching._search({
    attributes: {
      ...attributes,
      colors: [" BLACK "],
      brand: "casio",
      locations: ["library"],
    },
  });

  expect(results).toContainEqual({ record: "calculator" });
});

test("excludes incompatible characteristics", async () => {
  for (const changed of [
    { category: "Bags" },
    { colors: ["red"] },
    { brand: "Other brand" },
    { locations: ["Gym"] },
    {
      start: "2026-10-19T10:00:00Z",
      end: "2026-10-19T14:00:00Z",
    },
  ]) {
    const results = await matching._search({
      attributes: { ...attributes, ...changed },
    });

    expect(results).not.toContainEqual({ record: "calculator" });
  }
});

test("unspecified optional characteristics do not exclude matches", async () => {
  const results = await matching._search({
    attributes: {
      ...attributes,
      colors: [],
      brand: "",
      locations: [],
    },
  });

  expect(results).toContainEqual({ record: "calculator" });
});

test("removing a record excludes it from search", async () => {
  await matching.register({
    record: "removed",
    attributes,
  });

  await matching.remove({ record: "removed" });

  expect(await matching._search({ attributes }))
    .not.toContainEqual({ record: "removed" });
});

test("rejects invalid time intervals", async () => {
  await expect(
    matching.register({
      record: "invalid",
      attributes: {
        ...attributes,
        end: "2026-10-17T10:00:00Z",
      },
    }),
  ).rejects.toBeInstanceOf(InvalidMatchAttributes);
});
