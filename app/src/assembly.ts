import { assemble } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { ItemReportingConcept } from "./concepts/ItemReporting.ts";
import { composition as accountsComposition } from "./compositions/Accounts.ts";
import { composition as reportsComposition } from "./compositions/Reports.ts";
import { db } from "./db.ts";
import { MatchingConcept } from "./concepts/Matching.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(db),
      ItemReporting: new ItemReportingConcept(db),
      Matching: new MatchingConcept(db),
    },
    composition: {
      Accounts: accountsComposition,
      Reports: reportsComposition,
    },
  });
}
