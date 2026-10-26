import linkingSpec from "../design/concepts/ConversationLinking.md" with { type: "text" };
import { ConversationLinkingConcept, LinkUnavailable } from "./concepts/ConversationLinking.ts";
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
  NoCompatibleRecord,
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
    NO_COMPATIBLE_RECORD: NoCompatibleRecord,
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

const conversationLinking = registerConcept({
  class: ConversationLinkingConcept, spec: linkingSpec,
  refusals: { LINK_UNAVAILABLE: LinkUnavailable },
});

import rewardingSpec from "../design/concepts/ContributionRewarding.md" with { type: "text" };
import { ContributionRewardingConcept, InvalidContribution, ContributionUnavailable, ContributionConflict } from "./concepts/ContributionRewarding.ts";
const contributionRewarding = registerConcept({
  class: ContributionRewardingConcept, spec: rewardingSpec,
  refusals: {
    INVALID_CONTRIBUTION: InvalidContribution,
    CONTRIBUTION_UNAVAILABLE: ContributionUnavailable,
    CONTRIBUTION_CONFLICT: ContributionConflict,
  },
});

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  ItemReporting: itemReporting,
  Matching: matching,
  Messaging: messaging,
  ConversationLinking: conversationLinking,
  ContributionRewarding: contributionRewarding,
});

export const { concepts } = applicationConceptSet;
