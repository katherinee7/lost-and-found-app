# ConversationLinking

## Purpose

Reserve a stable conversation identity for an initiator and a context.

## Principle

Resolving an initiator and context reserves a conversation identity.
Repeated or simultaneous resolutions of that pair return the same identity.
Different pairs receive different identities. The context can be retrieved
later from the conversation identity. This concept does not read reports,
create conversations, or decide access permissions.

## Types

```types
external User
  The initiator identity supplied by the application.
external Context
  An opaque context supplied by the application.
external Conversation
  A reserved identity used by the application for a conversation.
```

## State

```state
a set of Links with
  an initiator User
  a context Context
  a conversation Conversation
  an optional source Context
  unique initiator and context
  unique conversation
```

## Actions

```actions
attach (conversation: Conversation, source: Context) : returns (conversation: Conversation)
  where conversation is unknown or has a different source
  then
    refuses LINK_CONFLICT "This conversation is already linked to another source or is unavailable."
  where conversation exists and source is absent or the same
  then
    atomically associate source without replacing an existing different source
    returns conversation

source (conversation: Conversation) : returns (hasSource: Flag, source: Context)
  where conversation has no link
  then
    refuses LINK_UNAVAILABLE "That conversation has no linked context."
  where conversation has a link
  then
    bind hasSource to whether a source exists and source to it or an unused empty identity
    returns hasSource, source

get (conversation: Conversation) : returns (context: Context, initiator: User)
  where conversation has no link
  then
    refuses LINK_UNAVAILABLE "That conversation has no linked context."
  where a link exists
  then
    bind context and initiator to the linked values
    returns context, initiator

resolve (initiator: User, context: Context) : returns (conversation: Conversation)
  where a link for initiator and context exists
  then
    bind conversation to its reserved identity
    returns conversation
  where no link for initiator and context exists
  then
    reserve a fresh conversation identity and add the link
    returns conversation
```

## Queries

```queries
_context (conversation: Conversation) : optional (context: Context)
  answers the context linked to conversation, or no rows when unlinked
```
