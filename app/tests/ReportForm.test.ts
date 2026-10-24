import { expect, test } from "bun:test";
import { attributesFromFields, prefillReport } from "../web/src/report-form.ts";

const attributes = {
  category: "Electronics", colors: ["black"], brand: "Casio",
  start: "2026-11-01T06:30:12.345Z", end: "2026-11-01T08:30:12.345Z",
  locations: ["Library, east desk"],
};

test("prefilled drafts preserve every characteristic and exact instants on a title-only edit", () => {
  const original = structuredClone(attributes);
  const fields = prefillReport("Calculator", attributes);
  expect(fields.title).toBe("Calculator");
  expect(fields.brand).toBe("Casio");
  fields.title = "New title";
  expect(attributesFromFields(fields, attributes)).toEqual(attributes);
  expect(attributes).toEqual(original);
});

test("editing draft fields changes the payload without mutating the original", () => {
  const fields = prefillReport("Calculator", attributes);
  fields.colors = "red, silver";
  fields.brand = "Other";
  fields.locations = "Gym";
  const changed = attributesFromFields(fields, attributes);
  expect(changed).toEqual({ ...attributes, colors: ["red", "silver"], brand: "Other", locations: ["Gym"] });
  expect(attributes.colors).toEqual(["black"]);
  fields.start = "";
  expect(() => attributesFromFields(fields, attributes)).toThrow("valid time interval");
  fields.start = "2026-12-01T10:00";
  fields.end = "2026-11-01T10:00";
  expect(() => attributesFromFields(fields, attributes)).toThrow("valid time interval");
});
