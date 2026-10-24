# Messages

A signed-in user can [start or reopen a conversation](reaction:Messages.Start)
with the author of an open missing report belonging to someone else.
The recipient is resolved by the backend from the report ID.

Users can [list their conversations](reaction:Messages.List),
[read a conversation](reaction:Messages.Read),
and [send a message](reaction:Messages.Send).

Every request authenticates its session. Read and send actions enforce
conversation membership. Sender identity comes from the session.

Start authenticates and checks ItemReporting.contactTarget before reserving
an identity with ConversationLinking.resolve, using the signed-in finder as
initiator and the missing report as context. Messaging.ensure creates or
reopens that identity with the finder and owner as participants. Stable tuple
keys and atomic upserts enforce one conversation per finder/report pair,
including simultaneous requests across processes. Different reports or finders
receive separate conversations. Existing messages are never replaced by ensure.
A retry after a partially completed start reuses the reservation.

ConversationLinking is independent: it allocates identities for opaque contexts
and never reads ItemReporting or Messaging. Messaging has no report IDs, report
queries, usernames, or report lifecycle logic. Only the composition connects
these concepts through the generic Context and Conversation parameters.

The [conversation list former](former:Messages.ConversationList) begins with
Messaging._for to enforce membership, then joins the link's context to
ItemReporting._title and the other participant to Authenticating._username.
It returns conversation ID, other participant ID, current title, and username,
without full report attributes. Internal title and username queries are not
public endpoints. Optional joins retain pre-existing unlinked conversations;
they have title null and display Earlier conversation. Unknown usernames use
an explicit fallback. Old conversations cannot be linked reliably because no
report identity was recorded; their messages are preserved, not merged.

Report edits change the title shown on the next list refresh. Closure neither
deletes the link nor changes Messaging membership. Participants can continue
listing, reading, and sending through Messages after closure. Start still
requires an open missing report; closed-report conversations reopen from the
Messages list. The existing Messages-screen refresh/polling behavior is retained.

```endpoints
Messages.Start at /messages/start
Messages.List at /messages/list
Messages.Read at /messages/read
Messages.Send at /messages/send
```
