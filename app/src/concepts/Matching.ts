import type { Collection, Db } from "mongodb";

export class InvalidMatchAttributes extends Error {}
export class NoCompatibleRecord extends Error {}

interface Attributes {
  category: string;
  colors: string[];
  brand: string;
  start: string;
  end: string;
  locations: string[];
}

interface Entry {
  _id: string;
  attributes: Attributes;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  );
}

function valid(value: unknown): value is Attributes {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.category === "string" &&
    normalize(item.category).length > 0 &&
    strings(item.colors) &&
    strings(item.locations) &&
    typeof item.brand === "string" &&
    typeof item.start === "string" &&
    typeof item.end === "string" &&
    Number.isFinite(Date.parse(item.start)) &&
    Number.isFinite(Date.parse(item.end)) &&
    Date.parse(item.start) <= Date.parse(item.end)
  );
}

function overlap(left: string[], right: string[]) {
  const a = left.map(normalize).filter(Boolean);
  const b = right.map(normalize).filter(Boolean);

  // An unspecified characteristic does not exclude a match.
  if (a.length === 0 || b.length === 0) return true;

  return a.some((value) => b.includes(value));
}

export function compatible(a: Attributes, b: Attributes) {
  if (normalize(a.category) !== normalize(b.category)) {
    return false;
  }

  if (
    Date.parse(a.start) > Date.parse(b.end) ||
    Date.parse(b.start) > Date.parse(a.end)
  ) {
    return false;
  }

  const brandA = normalize(a.brand);
  const brandB = normalize(b.brand);

  return (
    overlap(a.colors, b.colors) &&
    overlap(a.locations, b.locations) &&
    (!brandA || !brandB || brandA === brandB)
  );
}

export class MatchingConcept {
  private readonly entries: Collection<Entry>;

  constructor(db: Db) {
    this.entries = db.collection<Entry>("matching.entries");
  }

  async register({
    record,
    attributes,
  }: {
    record: string;
    attributes: Attributes;
  }) {
    if (!valid(attributes)) {
      throw new InvalidMatchAttributes(
        "Invalid matching characteristics.",
      );
    }

    await this.entries.updateOne(
      { _id: record },
      { $set: { attributes } },
      { upsert: true },
    );

    return { record };
  }

  async remove({ record }: { record: string }) {
    await this.entries.deleteOne({ _id: record });
    return { record };
  }

  async requireMatch({ record, attributes }: { record: string; attributes: Attributes }) {
    if (!valid(attributes)) throw new InvalidMatchAttributes("Invalid matching characteristics.");
    const entry = await this.entries.findOne({ _id: record });
    if (!entry || !compatible(entry.attributes, attributes)) {
      throw new NoCompatibleRecord("That record is not a current compatible match.");
    }
    return { record };
  }

  async _search({ attributes }: { attributes: Attributes }) {
    if (!valid(attributes)) return [];

    const entries = await this.entries.find().toArray();

    return entries
      .filter((entry) => compatible(entry.attributes, attributes))
      .map((entry) => ({ record: entry._id }));
  }
}
