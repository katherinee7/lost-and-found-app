import type { Collection, Db } from "mongodb";

export class InvalidReport extends Error {}
export class ReportUnavailable extends Error {}

export const categories = [
  "Electronics",
  "Keys and cards",
  "Clothing and accessories",
  "Bags",
  "Books and stationery",
  "Bottles and containers",
  "Other",
];

export interface Attributes {
  category: string;
  colors: string[];
  brand: string;
  start: string;
  end: string;
  locations: string[];
}

export type Kind = "missing" | "found";

interface ReportDocument {
  _id: string;
  author: string;
  kind?: Kind;
  title: string;
  attributes: Attributes;
  open: boolean;
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(
      (entry) =>
        typeof entry === "string" &&
        entry.trim().length > 0 &&
        entry.length <= 100,
    )
  );
}

export function validAttributes(
  value: unknown,
): value is Attributes {
  if (!isObject(value)) return false;

  return (
    typeof value.category === "string" &&
    categories.includes(value.category) &&
    validStrings(value.colors) &&
    validStrings(value.locations) &&
    typeof value.brand === "string" &&
    value.brand.length <= 100 &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    Number.isFinite(Date.parse(value.start)) &&
    Number.isFinite(Date.parse(value.end)) &&
    Date.parse(value.start) <= Date.parse(value.end)
  );
}

function normalizedAttributes(attributes: Attributes): Attributes {
  return {
    category: attributes.category,
    colors: attributes.colors.map((color) => color.trim()),
    brand: attributes.brand.trim(),
    start: attributes.start,
    end: attributes.end,
    locations: attributes.locations.map((location) => location.trim()),
  };
}

function validContent(title: unknown, attributes: unknown): boolean {
  return typeof title === "string" && !!title.trim() &&
    title.length <= 120 && validAttributes(attributes);
}

export class ItemReportingConcept {
  private readonly reports: Collection<ReportDocument>;

  constructor(db: Db) {
    this.reports =
      db.collection<ReportDocument>("itemreporting.reports");
  }

  async create({
    author,
    title,
    kind,
    attributes,
  }: {
    author: string;
    title: string;
    kind: Kind;
    attributes: Attributes;
  }) {
    if (
      (kind !== "missing" && kind !== "found") ||
      !validContent(title, attributes)
    ) {
      throw new InvalidReport(
        "Check the report fields and time interval.",
      );
    }

    const report = crypto.randomUUID();

    await this.reports.insertOne({
      _id: report,
      author,
      kind,
      title: title.trim(),
      attributes: normalizedAttributes(attributes),
      open: true,
    });

    return { report };
  }

  async update({ author, report, title, attributes }: {
    author: string;
    report: string;
    title: string;
    attributes: Attributes;
  }) {
    if (!validContent(title, attributes)) {
      throw new InvalidReport("Check the report fields and time interval.");
    }
    const result = await this.reports.updateOne(
      { _id: report, author, open: true },
      { $set: { title: title.trim(), attributes: normalizedAttributes(attributes) } },
    );
    if (result.matchedCount === 0) {
      throw new ReportUnavailable("That report is unavailable.");
    }
    return { report };
  }

  async _own({ author }: { author: string }) {
    const reports = await this.reports.find({ author }).toArray();

    return reports.map(({ _id, title, kind, attributes, open }) => ({
      report: _id,
      kind: kind ?? "missing",
      title,
      attributes,
      open,
    }));
  }

  async close({
    author,
    report,
  }: {
    author: string;
    report: string;
  }) {
    // Both conditions are checked in the database operation.
    const result = await this.reports.updateOne(
      { _id: report, author },
      { $set: { open: false } },
    );

    if (result.matchedCount === 0) {
      throw new ReportUnavailable("That report is unavailable.");
    }

    return { report };
  }

  async readFound({ author, report }: {
    author: string;
    report: string;
  }) {
    const found = await this.reports.findOne({
      _id: report,
      author,
      kind: "found",
      open: true,
    });
    if (!found) throw new ReportUnavailable("That report is unavailable.");
    return { attributes: found.attributes };
  }

  async _summary({ report, requester }: {
    report: string;
    requester: string;
  }) {
    const found = await this.reports.findOne({
      _id: report,
      open: true,
    });

    if (
      !found ||
      (found.kind ?? "missing") !== "missing" ||
      found.author === requester
    ) return [];

    return [{
      title: found.title,
      category: found.attributes.category,
      start: found.attributes.start,
      end: found.attributes.end,
      locations: found.attributes.locations,
    }];
  }

  async contactTarget({
    requester,
    report,
  }: {
    requester: string;
    report: string;
  }) {
    const found = await this.reports.findOne({
      _id: report,
      open: true,
    });

    if (
      !found ||
      (found.kind ?? "missing") !== "missing" ||
      found.author === requester
    ) {
      throw new ReportUnavailable(
        "That report is unavailable or belongs to you.",
      );
    }

    return { owner: found.author };
  }
}
