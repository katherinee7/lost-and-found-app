import linkingSpec from "../design/concepts/ConversationLinking.md" with { type: "text" };
import { ConversationLinkingConcept } from "./concepts/ConversationLinking.ts";
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

import messagingSpec from "../design/concepts/Messaging.md" with { type: "text" };

import {
  MessagingConcept,
  InvalidParticipants,
  InvalidMessage,
  ConversationUnavailable,
} from "./concepts/Messaging.ts";

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

const messaging = registerConcept({
  class: MessagingConcept,
  spec: messagingSpec,
  refusals: {
    INVALID_PARTICIPANTS: InvalidParticipants,
    INVALID_MESSAGE: InvalidMessage,
    CONVERSATION_UNAVAILABLE: ConversationUnavailable,
  },
});

const conversationLinking = registerConcept({ class: ConversationLinkingConcept, spec: linkingSpec });

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  ItemReporting: itemReporting,
  Matching: matching,
  Messaging: messaging,
  ConversationLinking: conversationLinking,
});

export const { concepts } = applicationConceptSet;
