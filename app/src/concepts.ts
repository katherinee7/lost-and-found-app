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

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
});

export const { concepts } = applicationConceptSet;
