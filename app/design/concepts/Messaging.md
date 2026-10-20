# Messaging

## Purpose

Support private conversations between two users.

## Principle

A conversation is created between two distinct participants.
Only its participants can read or send messages.
Each participant can retrieve their conversations.
Messages remain available after restarting the application.

## Types

```types
external User
  A participant in a conversation.

opaque Messages
  An ordered array of messages.
  Each message contains an ID, sender, text, and timestamp.
```

## State

```state
a set of Conversations with
  a first User
  a second User
  a messages Messages
```

## Actions

```actions
create (first: User, second: User) : returns (conversation: Conversation)
  where first equals second
  then
    refuses INVALID_PARTICIPANTS "Choose a different participant."
  where first differs from second
  then
    add a conversation with these participants and no messages
    returns conversation

send (sender: User, conversation: Conversation, text: String) : returns (message: String)
  where text is blank or longer than 2000 characters
  then
    refuses INVALID_MESSAGE "Messages must contain 1–2000 characters."
  where conversation does not exist or sender is not a participant
  then
    refuses CONVERSATION_UNAVAILABLE "That conversation is unavailable."
  where text is valid and sender is a participant
  then
    append a message with a fresh ID, sender, trimmed text, and current timestamp
    bind message to its ID
    returns message

read (user: User, conversation: Conversation) : returns (messages: Messages)
  where conversation does not exist or user is not a participant
  then
    refuses CONVERSATION_UNAVAILABLE "That conversation is unavailable."
  where user is a participant
  then
    bind messages to the conversation's ordered messages
    returns messages
```

## Queries

```queries
_for (user: User) : many (conversation: Conversation, other: User)
  answers the conversations in which user is a participant
  other identifies the other participant
  answers no rows when user has no conversations
```
