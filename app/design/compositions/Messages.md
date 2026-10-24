# Messages

A signed-in user can [start a conversation](reaction:Messages.Start)
with the author of an open missing report belonging to someone else.
The recipient is resolved by the backend from the report ID.

Users can [list their conversations](reaction:Messages.List),
[read a conversation](reaction:Messages.Read),
and [send a message](reaction:Messages.Send).

Every request authenticates its session. Read and send actions enforce
conversation membership. Sender identity comes from the session.

The [conversation list former](former:Messages.ConversationList)
formats the authenticated user's conversation IDs and other participants.

Each start request creates a new conversation. Conversations remain
available after the associated report closes.

```endpoints
Messages.Start at /messages/start
Messages.List at /messages/list
Messages.Read at /messages/read
Messages.Send at /messages/send
```
