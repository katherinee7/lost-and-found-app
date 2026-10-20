import reportingSpec from "../design/concepts/ItemReporting.md" with { type: "text" };

import {
  ItemReportingConcept,
  InvalidReport,
  ReportUnavailable,
} from "./concepts/ItemReporting.ts";

import matchingSpec from "../design/concepts/Matching.md" with { type: "text" };

import {
  MatchingConcept,
  InvalidMatchAttributes,
} from "./concepts/Matching.ts";

import {
  conceptSet,
  registerConcept,
} from "@mit-sdg/sync-engine/assembly";

import spec from "../design/concepts/Authenticating.md" with { type: "text" };

import {
  AuthenticatingConcept,
  InvalidUsername,
  WeakPassword,
  UsernameTaken,
  InvalidCredentials,
  UnknownSession,
} from "./concepts/Authenticating.ts";

const authenticating = registerConcept({
  class: AuthenticatingConcept,
  spec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    WEAK_PASSWORD: WeakPassword,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
    UNKNOWN_SESSION: UnknownSession,
  },
});

const itemReporting = registerConcept({
  class: ItemReportingConcept,
  spec: reportingSpec,
  refusals: {
    INVALID_REPORT: InvalidReport,
    REPORT_UNAVAILABLE: ReportUnavailable,
  },
});

const matching = registerConcept({
  class: MatchingConcept,
  spec: matchingSpec,
  refusals: {
    INVALID_MATCH_ATTRIBUTES: InvalidMatchAttributes,
  },
});
export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  ItemReporting: itemReporting,
  Matching: matching,
});

export const { concepts } = applicationConceptSet;
