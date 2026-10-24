export interface ReportAttributes {
  category: string;
  colors: string[];
  brand: string;
  start: string;
  end: string;
  locations: string[];
}

export function emptyReportFields() {
  return { title: "", category: "Electronics", colors: "", brand: "", start: "", end: "", locations: "" };
}
export type ReportFields = ReturnType<typeof emptyReportFields>;

export function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString().slice(0, -1);
}

export function prefillReport(title: string, attributes: ReportAttributes): ReportFields {
  return {
    title, category: attributes.category, colors: attributes.colors.join(", "),
    brand: attributes.brand, start: localDateTime(attributes.start),
    end: localDateTime(attributes.end), locations: attributes.locations.join(", "),
  };
}

function split(value: string) {
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
}

export function attributesFromFields(fields: ReportFields, original?: ReportAttributes): ReportAttributes {
  // Preserve unchanged instants, including ambiguous daylight-saving times.
  const start = original && fields.start === localDateTime(original.start)
    ? new Date(original.start) : new Date(fields.start);
  const end = original && fields.end === localDateTime(original.end)
    ? new Date(original.end) : new Date(fields.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    throw new Error("Enter a valid time interval with start before end.");
  }
  return {
    category: fields.category,
    colors: original && fields.colors === original.colors.join(", ") ? [...original.colors] : split(fields.colors),
    brand: fields.brand,
    start: start.toISOString(), end: end.toISOString(),
    locations: original && fields.locations === original.locations.join(", ") ? [...original.locations] : split(fields.locations),
  };
}
