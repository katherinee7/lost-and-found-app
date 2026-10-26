import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { is, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
const { Authenticating, ConversationLinking, Messaging, ItemReporting, Matching, ContributionRewarding } = concepts;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function id(value: unknown) { return typeof value === "string" && value.length > 0 && value.length <= 128; }
const sessionInput: EndpointValidator = value => object(value) && id(value.session)
  ? { ok: true } : { ok: false, detail: "A session is required." };
const conversationInput: EndpointValidator = value => object(value) && id(value.session) && id(value.conversation)
  ? { ok: true } : { ok: false, detail: "A conversation is required." };
const statusOutput: EndpointValidator = value => {
  if (!object(value) || !object(value.status)) return { ok: false, detail: "Expected return confirmation status." };
  const status = value.status;
  return ["registered", "contributorConfirmed", "recipientConfirmed", "rewarded"].every(key => typeof status[key] === "boolean") &&
    (status.role === "contributor" || status.role === "recipient")
    ? { ok: true } : { ok: false, detail: "Expected return confirmation status." };
};
const balanceOutput: EndpointValidator = value => object(value) && Number.isSafeInteger(value.points) && (value.points as number) >= 0
  ? { ok: true } : { ok: false, detail: "Expected a point total." };

const Begin = endpoint("/returns/begin", ({ session, conversation, user, report, contributor, recipient, status, rewarded }) =>
  receive({ session, conversation })
    .then(Authenticating.authenticate({ session }).responds({ user }))
    .then(ConversationLinking.get({ conversation }).responds({ context: report, initiator: contributor }))
    .then(ItemReporting.returnInfo({ report }).responds({ author: recipient }))
    .then(Messaging.checkParticipants({ conversation, first: recipient, second: contributor }))
    .then(ContributionRewarding.register({ user, contribution: report, contributor, recipient }).responds({ status, rewarded }))
    .then(
      where(is.among(rewarded, [false])).then(respond({ status })).named("pending"),
      where(is.among(rewarded, [true]))
        .then(ItemReporting.close({ author: recipient, report }))
        .then(Matching.remove({ record: report }))
        .then(respond({ status })).named("completed"),
    ),
  { input: { required: ["session", "conversation"] }, validators: { input: conversationInput, output: statusOutput } },
);

const Confirm = endpoint("/returns/confirm", ({ session, conversation, user, report, contributor, recipient, status, rewarded }) =>
  receive({ session, conversation })
    .then(Authenticating.authenticate({ session }).responds({ user }))
    .then(ConversationLinking.get({ conversation }).responds({ context: report, initiator: contributor }))
    .then(ItemReporting.returnInfo({ report }).responds({ author: recipient }))
    .then(Messaging.checkParticipants({ conversation, first: recipient, second: contributor }))
    .then(ContributionRewarding.confirm({ user, contribution: report, contributor }).responds({ status, rewarded, recipient }))
    .then(
      where(is.among(rewarded, [false])).then(respond({ status })).named("pending"),
      where(is.among(rewarded, [true]))
        .then(ItemReporting.close({ author: recipient, report }))
        .then(Matching.remove({ record: report }))
        .then(respond({ status })).named("completed"),
    ),
  { input: { required: ["session", "conversation"] }, validators: { input: conversationInput, output: statusOutput } },
);

// Completed status reads also repair a prior failure between reward and closure.
const Status = endpoint("/returns/status", ({ session, conversation, user, report, contributor, recipient, status, rewarded }) =>
  receive({ session, conversation })
    .then(Authenticating.authenticate({ session }).responds({ user }))
    .then(ConversationLinking.get({ conversation }).responds({ context: report, initiator: contributor }))
    .then(ItemReporting.returnInfo({ report }).responds({ author: recipient }))
    .then(Messaging.checkParticipants({ conversation, first: recipient, second: contributor }))
    .then(ContributionRewarding.status({ user, contribution: report, contributor, recipient }).responds({ status, rewarded }))
    .then(
      where(is.among(rewarded, [false])).then(respond({ status })).named("pending"),
      where(is.among(rewarded, [true]))
        .then(ItemReporting.close({ author: recipient, report }))
        .then(Matching.remove({ record: report }))
        .then(respond({ status })).named("completed"),
    ),
  { input: { required: ["session", "conversation"] }, validators: { input: conversationInput, output: statusOutput } },
);

const Balance = endpoint("/returns/balance", ({ session, user, points }) =>
  receive({ session })
    .then(Authenticating.authenticate({ session }).responds({ user }))
    .then(ContributionRewarding.balance({ user }).responds({ points }))
    .then(respond({ points })),
  { input: { required: ["session"] }, validators: { input: sessionInput, output: balanceOutput } },
);
export const composition = { Begin, Confirm, Status, Balance };
