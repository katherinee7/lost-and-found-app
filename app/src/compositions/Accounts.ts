import {
  endpoint,
  receive,
  respond,
  type EndpointValidator,
} from "@mit-sdg/sync-engine/boundary";

import { concepts } from "../concepts.ts";

const { Authenticating } = concepts;

function object(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const credentialsInput: EndpointValidator = (value) =>
  object(value) &&
  typeof value.username === "string" &&
  typeof value.password === "string" &&
  value.username.length <= 32 &&
  value.password.length <= 128
    ? { ok: true }
    : { ok: false, detail: "Enter a username and password." };

const sessionInput: EndpointValidator = (value) =>
  object(value) &&
  typeof value.session === "string" &&
  value.session.length > 0 &&
  value.session.length <= 128
    ? { ok: true }
    : { ok: false, detail: "A session is required." };

const userOutput: EndpointValidator = (value) =>
  object(value) && typeof value.user === "string"
    ? { ok: true }
    : { ok: false, detail: "Expected a user ID." };

const sessionOutput: EndpointValidator = (value) =>
  object(value) && typeof value.session === "string"
    ? { ok: true }
    : { ok: false, detail: "Expected a session." };

const endedOutput: EndpointValidator = (value) =>
  object(value) && value.ended === true
    ? { ok: true }
    : { ok: false, detail: "Expected logout confirmation." };

const Register = endpoint(
  "/auth/register",
  ({ username, password, user }) =>
    receive({ username, password })
      .then(
        Authenticating.register({ username, password })
          .responds({ user }),
      )
      .then(respond({ user })),
  {
    input: { required: ["username", "password"] },
    validators: {
      input: credentialsInput,
      output: userOutput,
    },
  },
);

const Login = endpoint(
  "/auth/login",
  ({ username, password, session }) =>
    receive({ username, password })
      .then(
        Authenticating.login({ username, password })
          .responds({ session }),
      )
      .then(respond({ session })),
  {
    input: { required: ["username", "password"] },
    validators: {
      input: credentialsInput,
      output: sessionOutput,
    },
  },
);

const Current = endpoint(
  "/auth/current",
  ({ session, user }) =>
    receive({ session })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(respond({ user })),
  {
    input: { required: ["session"] },
    validators: {
      input: sessionInput,
      output: userOutput,
    },
  },
);

const Logout = endpoint(
  "/auth/logout",
  ({ session, ended }) =>
    receive({ session })
      .then(
        Authenticating.logout({ session })
          .responds({ ended }),
      )
      .then(respond({ ended })),
  {
    input: { required: ["session"] },
    validators: {
      input: sessionInput,
      output: endedOutput,
    },
  },
);

export const composition = {
  Register,
  Login,
  Current,
  Logout,
};
