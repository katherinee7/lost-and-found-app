import {
  endpoint,
  receive,
  respond,
  type EndpointValidator,
} from "@mit-sdg/sync-engine/boundary";
import {
  each,
  form,
  former,
} from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { validAttributes } from "../concepts/ItemReporting.ts";

const { Authenticating, ItemReporting, Matching } = concepts;

function object(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasSession(value: Record<string, unknown>) {
  return (
    typeof value.session === "string" &&
    value.session.length > 0 &&
    value.session.length <= 128
  );
}

const sessionInput: EndpointValidator = (value) =>
  object(value) && hasSession(value)
    ? { ok: true }
    : { ok: false, detail: "A session is required." };

const createInput: EndpointValidator = (value) =>
  object(value) &&
  hasSession(value) &&
  typeof value.title === "string" &&
  value.title.trim().length > 0 &&
  value.title.length <= 120 &&
  (value.kind === "missing" || value.kind === "found") &&
  validAttributes(value.attributes)
    ? { ok: true }
    : { ok: false, detail: "Check the report fields." };

const closeInput: EndpointValidator = (value) =>
  object(value) &&
  hasSession(value) &&
  typeof value.report === "string" &&
  value.report.length > 0 &&
  value.report.length <= 128
    ? { ok: true }
    : { ok: false, detail: "A report ID is required." };

const updateInput: EndpointValidator = (value) =>
  object(value) &&
  hasSession(value) &&
  typeof value.report === "string" && value.report.length > 0 && value.report.length <= 128 &&
  typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 120 &&
  validAttributes(value.attributes)
    ? { ok: true }
    : { ok: false, detail: "Check the report fields." };

const reportOutput: EndpointValidator = (value) =>
  object(value) && typeof value.report === "string"
    ? { ok: true }
    : { ok: false, detail: "Expected a report ID." };

const listOutput: EndpointValidator = (value) => {
  if (
    !object(value) ||
    !object(value.book) ||
    !Array.isArray(value.book.reports)
  ) {
    return { ok: false, detail: "Expected a report list." };
  }

  const valid = value.book.reports.every(
    (entry) =>
      object(entry) &&
      typeof entry.report === "string" &&
      typeof entry.title === "string" &&
      typeof entry.open === "boolean" &&
      (entry.kind === "missing" || entry.kind === "found") &&
      validAttributes(entry.attributes),
  );

  return valid
    ? { ok: true }
    : { ok: false, detail: "Invalid report list." };
};

const OwnReports = former(
  "the authenticated user's reports",
  (
    { author },
    { report, title, kind, attributes, open },
  ) =>
    form({
      reports: each(
        ItemReporting._own({ author }).is({
          report,
          title,
          kind,
          attributes,
          open,
        }),
      ).form({ report, title, kind, attributes, open }),
    }),
);

const Create = endpoint(
  "/reports/create",
  ({ session, author, title, kind, attributes, report }) =>
    receive({ session, title, kind, attributes })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user: author }),
      )
      .then(
        ItemReporting.create({ author, title, kind, attributes })
          .responds({ report }),
      )
      .then(Matching.register({ record: report, attributes }))
      .then(respond({ report })),
  {
    input: { required: ["session", "title", "kind", "attributes"] },
    validators: {
      input: createInput,
      output: reportOutput,
    },
  },
);

const Update = endpoint(
  "/reports/update",
  ({ session, author, report, title, attributes }) =>
    receive({ session, report, title, attributes })
      .then(Authenticating.authenticate({ session }).responds({ user: author }))
      .then(ItemReporting.update({ author, report, title, attributes }).responds({ report }))
      .then(Matching.register({ record: report, attributes }))
      .then(respond({ report })),
  {
    input: { required: ["session", "report", "title", "attributes"] },
    validators: { input: updateInput, output: reportOutput },
  },
);

const List = endpoint(
  "/reports/list",
  ({ session, author }) =>
    receive({ session })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user: author }),
      )
      .then(respond({ book: OwnReports({ author }) })),
  {
    input: { required: ["session"] },
    validators: {
      input: sessionInput,
      output: listOutput,
    },
  },
);

const Close = endpoint(
  "/reports/close",
  ({ session, author, report }) =>
    receive({ session, report })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user: author }),
      )
      .then(
        ItemReporting.close({ author, report })
          .responds({ report }),
      )
      .then(Matching.remove({ record: report }))
      .then(respond({ report })),
  {
    input: { required: ["session", "report"] },
    validators: {
      input: closeInput,
      output: reportOutput,
    },
  },
);

const searchInput: EndpointValidator = (value) =>
  object(value) &&
  hasSession(value) &&
  validAttributes(value.attributes)
    ? { ok: true }
    : { ok: false, detail: "Check the search fields." };

const searchOutput: EndpointValidator = (value) => {
  if (
    !object(value) ||
    !object(value.results) ||
    !Array.isArray(value.results.matches)
  ) {
    return { ok: false, detail: "Expected search results." };
  }

  const valid = value.results.matches.every(
    (entry) =>
      object(entry) &&
      typeof entry.report === "string" &&
      typeof entry.title === "string" &&
      typeof entry.category === "string" &&
      typeof entry.start === "string" &&
      typeof entry.end === "string" &&
      Array.isArray(entry.locations) &&
      entry.locations.every(
        (location) => typeof location === "string",
      ),
  );

  return valid
    ? { ok: true }
    : { ok: false, detail: "Invalid search results." };
};

const SearchResults = former(
  "limited summaries of compatible open reports",
  (
    { attributes, user },
    { report, title, category, start, end, locations },
  ) =>
    form({
      matches: each(
        Matching._search({ attributes }).is({ record: report }),
      )
        .where(
          ItemReporting._summary({ report, requester: user }).is({
            title,
            category,
            start,
            end,
            locations,
          }),
        )
        .form({
          report,
          title,
          category,
          start,
          end,
          locations,
        }),
    }),
);

const Search = endpoint(
  "/reports/search",
  ({ session, attributes, user }) =>
    receive({ session, attributes })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(
        respond({
          results: SearchResults({ attributes, user }),
        }),
      ),
  {
    input: { required: ["session", "attributes"] },
    validators: {
      input: searchInput,
      output: searchOutput,
    },
  },
);

const Matches = endpoint(
  "/reports/matches",
  ({ session, user, report, attributes }) =>
    receive({ session, report })
      .then(Authenticating.authenticate({ session }).responds({ user }))
      .then(ItemReporting.readFound({ author: user, report }).responds({ attributes }))
      .then(respond({ results: SearchResults({ attributes, user }) })),
  {
    input: { required: ["session", "report"] },
    validators: { input: closeInput, output: searchOutput },
  },
);

export const composition = {
  OwnReports,
  Create,
  Update,
  List,
  Close,
  SearchResults,
  Search,
  Matches,
};
