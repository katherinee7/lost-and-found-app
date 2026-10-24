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
  whether,
} from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Authenticating, ItemReporting, Messaging, ConversationLinking } = concepts;

function object(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function id(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128
  );
}

function input(
  accepts: (value: Record<string, unknown>) => boolean,
): EndpointValidator {
  return (value) =>
    object(value) && id(value.session) && accepts(value)
      ? { ok: true }
      : { ok: false, detail: "Invalid messaging request." };
}

const startInput = input((value) => id(value.report));
const listInput = input(() => true);

const readInput = input(
  (value) => id(value.conversation),
);

const sendInput = input(
  (value) =>
    id(value.conversation) &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    value.text.length <= 2000,
);

const conversationOutput: EndpointValidator = (value) =>
  object(value) && id(value.conversation)
    ? { ok: true }
    : { ok: false, detail: "Expected a conversation ID." };

const messageOutput: EndpointValidator = (value) =>
  object(value) && id(value.message)
    ? { ok: true }
    : { ok: false, detail: "Expected a message ID." };

const messagesOutput: EndpointValidator = (value) =>
  object(value) &&
  Array.isArray(value.messages) &&
  value.messages.every(
    (message) =>
      object(message) &&
      id(message.id) &&
      id(message.sender) &&
      typeof message.text === "string" &&
      typeof message.sentAt === "string",
  )
    ? { ok: true }
    : { ok: false, detail: "Expected messages." };

const listOutput: EndpointValidator = (value) =>
  object(value) &&
  object(value.book) &&
  Array.isArray(value.book.conversations) &&
  value.book.conversations.every(
    (entry) =>
      object(entry) &&
      id(entry.conversation) &&
      id(entry.other) &&
      (entry.title === null || typeof entry.title === "string") &&
      (entry.username === null || typeof entry.username === "string"),
  )
    ? { ok: true }
    : { ok: false, detail: "Expected conversations." };

const ConversationList = former(
  "the authenticated user's conversations",
  ({ user }, { conversation, other, report, title, username }) =>
    form({
      conversations: each(
        Messaging._for({ user }).is({
          conversation,
          other,
        }),
      )
        .where(
          whether(ConversationLinking._context({ conversation }).is({ context: report })),
          whether(ItemReporting._title({ report }).is({ title })),
          whether(Authenticating._username({ user: other }).is({ username })),
        )
        .form({ conversation, other, title, username }),
    }),
);

const Start = endpoint(
  "/messages/start",
  ({ session, report, user, owner, conversation }) =>
    receive({ session, report })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(
        ItemReporting.contactTarget({
          requester: user,
          report,
        }).responds({ owner }),
      )
      .then(
        ConversationLinking.resolve({ initiator: user, context: report }).responds({ conversation }),
      )
      .then(
        Messaging.ensure({ conversation, first: user, second: owner }),
      )
      .then(respond({ conversation })),
  {
    input: { required: ["session", "report"] },
    validators: {
      input: startInput,
      output: conversationOutput,
    },
  },
);

const List = endpoint(
  "/messages/list",
  ({ session, user }) =>
    receive({ session })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(
        respond({ book: ConversationList({ user }) }),
      ),
  {
    input: { required: ["session"] },
    validators: {
      input: listInput,
      output: listOutput,
    },
  },
);

const Read = endpoint(
  "/messages/read",
  ({ session, user, conversation, messages }) =>
    receive({ session, conversation })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(
        Messaging.read({ user, conversation })
          .responds({ messages }),
      )
      .then(respond({ messages })),
  {
    input: { required: ["session", "conversation"] },
    validators: {
      input: readInput,
      output: messagesOutput,
    },
  },
);

const Send = endpoint(
  "/messages/send",
  ({ session, user, conversation, text, message }) =>
    receive({ session, conversation, text })
      .then(
        Authenticating.authenticate({ session })
          .responds({ user }),
      )
      .then(
        Messaging.send({
          sender: user,
          conversation,
          text,
        }).responds({ message }),
      )
      .then(respond({ message })),
  {
    input: {
      required: ["session", "conversation", "text"],
    },
    validators: {
      input: sendInput,
      output: messageOutput,
    },
  },
);

export const composition = {
  ConversationList,
  Start,
  List,
  Read,
  Send,
};
