# Messages

A signed-in user can [start or reopen a conversation](reaction:Messages.Start)
with the author of an open missing report belonging to someone else.
The recipient is resolved by the backend from the report ID.

Users can [list their conversations](reaction:Messages.List),
[read a conversation](reaction:Messages.Read),
and [send a message](reaction:Messages.Send).

Every request authenticates its session. Read and send actions enforce
conversation membership. Sender identity comes from the session.

Finder-search Start requires the search attributes and checks
Matching.requireMatch against the target's current registered attributes, in
addition to ItemReporting.contactTarget. The frontend retains the attributes
of the successful search that produced the displayed results, even if the form
is subsequently edited. Missing or malformed attributes are rejected. This
rechecks compatibility rather than storing search history or proving a prior
search request occurred.

[Contact from a saved record](reaction:Messages.StartSaved) requires the saved
found ID and target missing ID. It authenticates, calls ItemReporting.readFound
to enforce ownership and open found status, checks the target, and calls
Matching.requireMatch using the stored found attributes. Client-supplied
attributes cannot replace the saved record's attributes. Both contact endpoints
complete these checks before reserving any link or ensuring a conversation.
A stale, incompatible, self-authored, or closed target is rejected without
creating a link or conversation. Existing participants can continue reading
and sending after reports change or close; read/send do not recheck matching.

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
Messages.StartSaved at /messages/start-saved
Messages.List at /messages/list
Messages.Read at /messages/read
Messages.Send at /messages/send
```

Return recognition is coordinated by [Returns](Returns.md). Report-linked
conversations show confirmation status and owner/finder actions without changing
Messaging membership or making Messaging depend on reports or rewards. Unlinked
legacy conversations keep their messages but cannot initiate recognition.

StartSaved attaches the validated found record as ConversationLinking's optional
source after ensuring the conversation. Repeated contacts from the same source
are idempotent; a different source cannot replace it and returns CONFLICT. This
association enables Returns to close the specific found record without guessing.
The source is never supplied by return-confirmation requests.
