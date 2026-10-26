import { ContributionRewardingConcept } from "./concepts/ContributionRewarding.ts";
import { composition as returnsComposition } from "./compositions/Returns.ts";
import { ConversationLinkingConcept } from "./concepts/ConversationLinking.ts";
import type { Db } from "mongodb";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { ItemReportingConcept } from "./concepts/ItemReporting.ts";
import { composition as accountsComposition } from "./compositions/Accounts.ts";
import { composition as reportsComposition } from "./compositions/Reports.ts";
import { db } from "./db.ts";
import { MatchingConcept } from "./concepts/Matching.ts";
import { MessagingConcept } from "./concepts/Messaging.ts";
import { composition as messagesComposition } from "./compositions/Messages.ts";

export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(database),
      ItemReporting: new ItemReportingConcept(database),
      Matching: new MatchingConcept(database),
      Messaging: new MessagingConcept(database),
      ConversationLinking: new ConversationLinkingConcept(database),
      ContributionRewarding: new ContributionRewardingConcept(database),
    },
    composition: {
      Accounts: accountsComposition,
      Reports: reportsComposition,
      Messages: messagesComposition,
      Returns: returnsComposition,
    },
  });
}
