<!-- Generated from the Backtrack assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Backtrack — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: Use 3–32 letters, numbers, underscores, or hyphens.
  - Refuses `WEAK_PASSWORD`: Use a password with 8–128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `login(username: String, password: String) : returns (session: Session)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.
- `authenticate(session: Session) : returns (user: User)`
  - Refuses `UNKNOWN_SESSION`: Please log in.
- `logout(session: Session) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: Please log in.

#### Queries

- `_username(user: User) : optional (username: String)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 6.

### ContributionRewarding

Defined in [ContributionRewarding](../design/concepts/ContributionRewarding.md), line 1.

#### Actions

- `register(user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)`
  - Refuses `INVALID_CONTRIBUTION`: A contribution needs two distinct participants.
  - Refuses `CONTRIBUTION_UNAVAILABLE`: Only the recipient can register this contribution.
  - Refuses `CONTRIBUTION_CONFLICT`: This contribution is registered with another participant.
- `confirm(user: User, contribution: Contribution, contributor: User) : returns (status: Status, rewarded: Flag, recipient: User)`
  - Refuses `CONTRIBUTION_UNAVAILABLE`: That contribution is unavailable to you in this context.
- `acknowledge(user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)`
  - Refuses `INVALID_CONTRIBUTION`: A contribution needs two distinct participants.
  - Refuses `CONTRIBUTION_UNAVAILABLE`: That contribution is unavailable to you in this context.
  - Refuses `CONTRIBUTION_CONFLICT`: This contribution is registered with another participant.
- `status(user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)`
  - Refuses `INVALID_CONTRIBUTION`: A contribution needs two distinct participants.
  - Refuses `CONTRIBUTION_UNAVAILABLE`: That contribution is unavailable to you in this context.
  - Refuses `CONTRIBUTION_CONFLICT`: This contribution is registered with another participant.
- `balance(user: User) : returns (points: Number)`

#### Instances

- `ContributionRewarding` — instance of `ContributionRewarding` — [Application types](../design/types.md), line 22.
  - `Contribution` is `ItemReporting.Report` — [Application types](../design/types.md), line 24.
  - `User` is `Authenticating.User` — [Application types](../design/types.md), line 23.

### ConversationLinking

Defined in [ConversationLinking](../design/concepts/ConversationLinking.md), line 1.

#### Actions

- `attach(conversation: Conversation, source: Context) : returns (conversation: Conversation)`
  - Refuses `LINK_CONFLICT`: This conversation is already linked to another source or is unavailable.
- `source(conversation: Conversation) : returns (hasSource: Flag, source: Context)`
  - Refuses `LINK_UNAVAILABLE`: That conversation has no linked context.
- `get(conversation: Conversation) : returns (context: Context, initiator: User)`
  - Refuses `LINK_UNAVAILABLE`: That conversation has no linked context.
- `resolve(initiator: User, context: Context) : returns (conversation: Conversation)`

#### Queries

- `_context(conversation: Conversation) : optional (context: Context)`

#### Instances

- `ConversationLinking` — instance of `ConversationLinking` — [Application types](../design/types.md), line 17.
  - `Context` is `ItemReporting.Report` — [Application types](../design/types.md), line 19.
  - `Conversation` is `Messaging.Conversation` — [Application types](../design/types.md), line 20.
  - `User` is `Authenticating.User` — [Application types](../design/types.md), line 18.

### ItemReporting

Defined in [ItemReporting](../design/concepts/ItemReporting.md), line 1.

#### Actions

- `create(author: User, title: String, kind: String, attributes: Attributes) : returns (report: Report)`
  - Refuses `INVALID_REPORT`: Check the report fields and time interval.
- `update(author: User, report: Report, title: String, attributes: Attributes) : returns (report: Report)`
  - Refuses `INVALID_REPORT`: Check the report fields and time interval.
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `closeFound(author: User, report: Report) : returns (report: Report)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `close(author: User, report: Report) : returns (report: Report)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `readFound(author: User, report: Report) : returns (attributes: Attributes)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `returnInfo(report: Report) : returns (author: User, open: Flag)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `contactTarget(requester: User, report: Report) : returns (owner: User)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable or belongs to you.

#### Queries

- `_title(report: Report) : optional (title: String)`
- `_own(author: User) : many (report: Report, title: String, kind: String, attributes: Attributes, open: Flag)`
- `_summary(report: Report, requester: User) : optional (title: String, category: String, start: String, end: String, locations: Locations)`

#### Instances

- `ItemReporting` — instance of `ItemReporting` — [Application types](../design/types.md), line 8.
  - `User` is `Authenticating.User` — [Application types](../design/types.md), line 9.

### Matching

Defined in [Matching](../design/concepts/Matching.md), line 1.

#### Actions

- `register(record: Record, attributes: Attributes) : returns (record: Record)`
  - Refuses `INVALID_MATCH_ATTRIBUTES`: Invalid matching characteristics.
- `requireMatch(record: Record, attributes: Attributes) : returns (record: Record)`
  - Refuses `INVALID_MATCH_ATTRIBUTES`: Invalid matching characteristics.
  - Refuses `NO_COMPATIBLE_RECORD`: That record is not a current compatible match.
- `remove(record: Record) : returns (record: Record)`

#### Queries

- `_search(attributes: Attributes) : many (record: Record)`

#### Instances

- `Matching` — instance of `Matching` — [Application types](../design/types.md), line 11.
  - `Record` is `ItemReporting.Report` — [Application types](../design/types.md), line 12.

### Messaging

Defined in [Messaging](../design/concepts/Messaging.md), line 1.

#### Actions

- `create(first: User, second: User) : returns (conversation: Conversation)`
  - Refuses `INVALID_PARTICIPANTS`: Choose a different participant.
- `ensure(conversation: Conversation, first: User, second: User) : returns (conversation: Conversation)`
  - Refuses `INVALID_PARTICIPANTS`: Choose a different participant.
- `checkParticipants(conversation: Conversation, first: User, second: User) : returns (conversation: Conversation)`
  - Refuses `CONVERSATION_UNAVAILABLE`: That conversation is unavailable.
- `send(sender: User, conversation: Conversation, text: String) : returns (message: String)`
  - Refuses `INVALID_MESSAGE`: Messages must contain 1–2000 characters.
  - Refuses `CONVERSATION_UNAVAILABLE`: That conversation is unavailable.
- `read(user: User, conversation: Conversation) : returns (messages: Messages)`
  - Refuses `CONVERSATION_UNAVAILABLE`: That conversation is unavailable.

#### Queries

- `_for(user: User) : many (conversation: Conversation, other: User)`

#### Instances

- `Messaging` — instance of `Messaging` — [Application types](../design/types.md), line 14.
  - `User` is `Authenticating.User` — [Application types](../design/types.md), line 15.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### limited summaries of compatible open reports

Authored path: `Reports.SearchResults`.
- Covered by [Reports](../design/compositions/Reports.md), line 17.

```former
Former "limited summaries of compatible open reports" — inputs (attributes, user); bindings (report, title, category, start, end, locations); promises exactly one record — forms:
  a record of
    matches: each Matching._search (attributes) has (record: report)
      where ItemReporting._summary (report, requester: user) has (category, end, locations, start, title)
      form a record of
        category
        end
        locations
        report
        start
        title
```

### the authenticated user's conversations

Authored path: `Messages.ConversationList`.
- Covered by [Messages](../design/compositions/Messages.md), line 46.

```former
Former "the authenticated user's conversations" — inputs (user); bindings (conversation, other, report, title, username); promises exactly one record — forms:
  a record of
    conversations: each Messaging._for (user) has (conversation, other)
      where whether ConversationLinking._context (conversation) has (context: report)
      where whether ItemReporting._title (report) has (title)
      where whether Authenticating._username (user: other) has (username)
      form a record of
        conversation
        other
        title
        username
```

### the authenticated user's reports

Authored path: `Reports.OwnReports`.
- Covered by [Reports](../design/compositions/Reports.md), line 12.

```former
Former "the authenticated user's reports" — inputs (author); bindings (report, title, kind, attributes, open); promises exactly one record — forms:
  a record of
    reports: each ItemReporting._own (author) has (attributes, kind, open, report, title)
      form a record of
        attributes
        kind
        open
        report
        title
```

## Reactions

### Accounts.Current

Authored path: `Accounts.Current`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 5.
- Covered by [Accounts](../design/compositions/Accounts.md), line 14.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Authenticating.authenticate (session)
```

### Accounts.Current#2

Authored path: `Accounts.Current`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 5.
- Covered by [Accounts](../design/compositions/Accounts.md), line 14.

```reaction
when Authenticating.authenticate (session, user), asked by Accounts.Current
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, user)
```

### Accounts.Login

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 4.
- Covered by [Accounts](../design/compositions/Accounts.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  Authenticating.login (password, username)
```

### Accounts.Login#2

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 4.
- Covered by [Accounts](../design/compositions/Accounts.md), line 13.

```reaction
when Authenticating.login (password, username, session), asked by Accounts.Login
where
  earlier, RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  RequestBoundary.respond (requestId, session)
```

### Accounts.Logout

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 6.
- Covered by [Accounts](../design/compositions/Accounts.md), line 15.

```reaction
when RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  Authenticating.logout (session)
```

### Accounts.Logout#2

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 6.
- Covered by [Accounts](../design/compositions/Accounts.md), line 15.

```reaction
when Authenticating.logout (session, ended), asked by Accounts.Logout
where
  earlier, RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  RequestBoundary.respond (ended, requestId)
```

### Accounts.Register

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 3.
- Covered by [Accounts](../design/compositions/Accounts.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### Accounts.Register#2

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 3.
- Covered by [Accounts](../design/compositions/Accounts.md), line 12.

```reaction
when Authenticating.register (password, username, user), asked by Accounts.Register
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (requestId, user)
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Messages.List

Authored path: `Messages.List`.
- Covered by [Messages](../design/compositions/Messages.md), line 7.
- Covered by [Messages](../design/compositions/Messages.md), line 65.

```reaction
when RequestBoundary.request (path: "/messages/list", requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.List#2

Authored path: `Messages.List`.
- Covered by [Messages](../design/compositions/Messages.md), line 7.
- Covered by [Messages](../design/compositions/Messages.md), line 65.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.List
where
  earlier, RequestBoundary.request (path: "/messages/list", requestId, session)
then
  RequestBoundary.respond (book: former "the authenticated user's conversations" with (user), requestId)
```

### Messages.Read

Authored path: `Messages.Read`.
- Covered by [Messages](../design/compositions/Messages.md), line 8.
- Covered by [Messages](../design/compositions/Messages.md), line 66.

```reaction
when RequestBoundary.request (conversation, path: "/messages/read", requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.Read#2

Authored path: `Messages.Read`.
- Covered by [Messages](../design/compositions/Messages.md), line 8.
- Covered by [Messages](../design/compositions/Messages.md), line 66.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.Read
where
  earlier, RequestBoundary.request (conversation, path: "/messages/read", requestId, session)
then
  Messaging.read (conversation, user)
```

### Messages.Read#3

Authored path: `Messages.Read`.
- Covered by [Messages](../design/compositions/Messages.md), line 8.
- Covered by [Messages](../design/compositions/Messages.md), line 66.

```reaction
when Messaging.read (conversation, user, messages), asked by Messages.Read#2
where
  earlier, RequestBoundary.request (conversation, path: "/messages/read", requestId, session)
then
  RequestBoundary.respond (messages, requestId)
```

### Messages.Send

Authored path: `Messages.Send`.
- Covered by [Messages](../design/compositions/Messages.md), line 9.
- Covered by [Messages](../design/compositions/Messages.md), line 67.

```reaction
when RequestBoundary.request (conversation, path: "/messages/send", requestId, session, text)
then
  Authenticating.authenticate (session)
```

### Messages.Send#2

Authored path: `Messages.Send`.
- Covered by [Messages](../design/compositions/Messages.md), line 9.
- Covered by [Messages](../design/compositions/Messages.md), line 67.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.Send
where
  earlier, RequestBoundary.request (conversation, path: "/messages/send", requestId, session, text)
then
  Messaging.send (conversation, sender: user, text)
```

### Messages.Send#3

Authored path: `Messages.Send`.
- Covered by [Messages](../design/compositions/Messages.md), line 9.
- Covered by [Messages](../design/compositions/Messages.md), line 67.

```reaction
when Messaging.send (conversation, sender: user, text, message), asked by Messages.Send#2
where
  earlier, RequestBoundary.request (conversation, path: "/messages/send", requestId, session, text)
then
  RequestBoundary.respond (message, requestId)
```

### Messages.Start

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when RequestBoundary.request (attributes, path: "/messages/start", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.Start#2

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.Start
where
  earlier, RequestBoundary.request (attributes, path: "/messages/start", report, requestId, session)
then
  ItemReporting.contactTarget (report, requester: user)
```

### Messages.Start#3

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when ItemReporting.contactTarget (report, requester: user, owner), asked by Messages.Start#2
where
  earlier, RequestBoundary.request (attributes, path: "/messages/start", report, requestId, session)
then
  Matching.requireMatch (attributes, record: report)
```

### Messages.Start#4

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when Matching.requireMatch (attributes, record: report), asked by Messages.Start#3
where
  earlier, Authenticating.authenticate (session, user), asked by Messages.Start
then
  ConversationLinking.resolve (context: report, initiator: user)
```

### Messages.Start#5

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when ConversationLinking.resolve (context: report, initiator: user, conversation), asked by Messages.Start#4
where
  earlier, ItemReporting.contactTarget (report, requester: user, owner), asked by Messages.Start#2
then
  Messaging.ensure (conversation, first: user, second: owner)
```

### Messages.Start#6

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 63.

```reaction
when Messaging.ensure (conversation, first: user, second: owner), asked by Messages.Start#5
where
  earlier, RequestBoundary.request (attributes, path: "/messages/start", report, requestId, session)
then
  RequestBoundary.respond (conversation, requestId)
```

### Messages.StartSaved

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when RequestBoundary.request (foundReport, path: "/messages/start-saved", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.StartSaved#2

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.StartSaved
where
  earlier, RequestBoundary.request (foundReport, path: "/messages/start-saved", report, requestId, session)
then
  ItemReporting.readFound (author: user, report: foundReport)
```

### Messages.StartSaved#3

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when ItemReporting.readFound (author: user, report: foundReport, attributes), asked by Messages.StartSaved#2
where
  earlier, RequestBoundary.request (foundReport, path: "/messages/start-saved", report, requestId, session)
then
  ItemReporting.contactTarget (report, requester: user)
```

### Messages.StartSaved#4

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when ItemReporting.contactTarget (report, requester: user, owner), asked by Messages.StartSaved#3
where
  earlier, ItemReporting.readFound (author: user, report: foundReport, attributes), asked by Messages.StartSaved#2
then
  Matching.requireMatch (attributes, record: report)
```

### Messages.StartSaved#5

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when Matching.requireMatch (attributes, record: report), asked by Messages.StartSaved#4
where
  earlier, Authenticating.authenticate (session, user), asked by Messages.StartSaved
then
  ConversationLinking.resolve (context: report, initiator: user)
```

### Messages.StartSaved#6

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when ConversationLinking.resolve (context: report, initiator: user, conversation), asked by Messages.StartSaved#5
where
  earlier, ItemReporting.contactTarget (report, requester: user, owner), asked by Messages.StartSaved#3
then
  Messaging.ensure (conversation, first: user, second: owner)
```

### Messages.StartSaved#7

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when Messaging.ensure (conversation, first: user, second: owner), asked by Messages.StartSaved#6
where
  earlier, ItemReporting.readFound (author: user, report: foundReport, attributes), asked by Messages.StartSaved#2
then
  ConversationLinking.attach (conversation, source: foundReport)
```

### Messages.StartSaved#8

Authored path: `Messages.StartSaved`.
- Covered by [Messages](../design/compositions/Messages.md), line 22.
- Covered by [Messages](../design/compositions/Messages.md), line 64.

```reaction
when ConversationLinking.attach (conversation, source: foundReport), asked by Messages.StartSaved#7
where
  earlier, RequestBoundary.request (foundReport, path: "/messages/start-saved", report, requestId, session)
then
  RequestBoundary.respond (conversation, requestId)
```

### Reports.Close

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 6.
- Covered by [Reports](../design/compositions/Reports.md), line 67.

```reaction
when RequestBoundary.request (path: "/reports/close", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.Close#2

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 6.
- Covered by [Reports](../design/compositions/Reports.md), line 67.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.Close
where
  earlier, RequestBoundary.request (path: "/reports/close", report, requestId, session)
then
  ItemReporting.close (author, report)
```

### Reports.Close#3

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 6.
- Covered by [Reports](../design/compositions/Reports.md), line 67.

```reaction
when ItemReporting.close (author, report), asked by Reports.Close#2
then
  Matching.remove (record: report)
```

### Reports.Close#4

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 6.
- Covered by [Reports](../design/compositions/Reports.md), line 67.

```reaction
when Matching.remove (record: report), asked by Reports.Close#3
where
  earlier, RequestBoundary.request (path: "/reports/close", report, requestId, session)
then
  RequestBoundary.respond (report, requestId)
```

### Reports.Create

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 64.

```reaction
when RequestBoundary.request (attributes, kind, path: "/reports/create", requestId, session, title)
then
  Authenticating.authenticate (session)
```

### Reports.Create#2

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 64.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.Create
where
  earlier, RequestBoundary.request (attributes, kind, path: "/reports/create", requestId, session, title)
then
  ItemReporting.create (attributes, author, kind, title)
```

### Reports.Create#3

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 64.

```reaction
when ItemReporting.create (attributes, author, kind, title, report), asked by Reports.Create#2
then
  Matching.register (attributes, record: report)
```

### Reports.Create#4

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 64.

```reaction
when Matching.register (attributes, record: report), asked by Reports.Create#3
where
  earlier, RequestBoundary.request (attributes, kind, path: "/reports/create", requestId, session, title)
then
  RequestBoundary.respond (report, requestId)
```

### Reports.List

Authored path: `Reports.List`.
- Covered by [Reports](../design/compositions/Reports.md), line 4.
- Covered by [Reports](../design/compositions/Reports.md), line 66.

```reaction
when RequestBoundary.request (path: "/reports/list", requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.List#2

Authored path: `Reports.List`.
- Covered by [Reports](../design/compositions/Reports.md), line 4.
- Covered by [Reports](../design/compositions/Reports.md), line 66.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.List
where
  earlier, RequestBoundary.request (path: "/reports/list", requestId, session)
then
  RequestBoundary.respond (book: former "the authenticated user's reports" with (author), requestId)
```

### Reports.Matches

Authored path: `Reports.Matches`.
- Covered by [Reports](../design/compositions/Reports.md), line 29.
- Covered by [Reports](../design/compositions/Reports.md), line 69.

```reaction
when RequestBoundary.request (path: "/reports/matches", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.Matches#2

Authored path: `Reports.Matches`.
- Covered by [Reports](../design/compositions/Reports.md), line 29.
- Covered by [Reports](../design/compositions/Reports.md), line 69.

```reaction
when Authenticating.authenticate (session, user), asked by Reports.Matches
where
  earlier, RequestBoundary.request (path: "/reports/matches", report, requestId, session)
then
  ItemReporting.readFound (author: user, report)
```

### Reports.Matches#3

Authored path: `Reports.Matches`.
- Covered by [Reports](../design/compositions/Reports.md), line 29.
- Covered by [Reports](../design/compositions/Reports.md), line 69.

```reaction
when ItemReporting.readFound (author: user, report, attributes), asked by Reports.Matches#2
where
  earlier, RequestBoundary.request (path: "/reports/matches", report, requestId, session)
then
  RequestBoundary.respond (requestId, results: former "limited summaries of compatible open reports" with (attributes, user))
```

### Reports.Search

Authored path: `Reports.Search`.
- Covered by [Reports](../design/compositions/Reports.md), line 15.
- Covered by [Reports](../design/compositions/Reports.md), line 68.

```reaction
when RequestBoundary.request (attributes, path: "/reports/search", requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.Search#2

Authored path: `Reports.Search`.
- Covered by [Reports](../design/compositions/Reports.md), line 15.
- Covered by [Reports](../design/compositions/Reports.md), line 68.

```reaction
when Authenticating.authenticate (session, user), asked by Reports.Search
where
  earlier, RequestBoundary.request (attributes, path: "/reports/search", requestId, session)
then
  RequestBoundary.respond (requestId, results: former "limited summaries of compatible open reports" with (attributes, user))
```

### Reports.Update

Authored path: `Reports.Update`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 65.

```reaction
when RequestBoundary.request (attributes, path: "/reports/update", report, requestId, session, title)
then
  Authenticating.authenticate (session)
```

### Reports.Update#2

Authored path: `Reports.Update`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 65.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.Update
where
  earlier, RequestBoundary.request (attributes, path: "/reports/update", report, requestId, session, title)
then
  ItemReporting.update (attributes, author, report, title)
```

### Reports.Update#3

Authored path: `Reports.Update`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 65.

```reaction
when ItemReporting.update (attributes, author, report, title), asked by Reports.Update#2
then
  Matching.register (attributes, record: report)
```

### Reports.Update#4

Authored path: `Reports.Update`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 65.

```reaction
when Matching.register (attributes, record: report), asked by Reports.Update#3
where
  earlier, RequestBoundary.request (attributes, path: "/reports/update", report, requestId, session, title)
then
  RequestBoundary.respond (report, requestId)
```

### Returns.Balance

Authored path: `Returns.Balance`.
- Covered by [Returns](../design/compositions/Returns.md), line 4.
- Covered by [Returns](../design/compositions/Returns.md), line 60.

```reaction
when RequestBoundary.request (path: "/returns/balance", requestId, session)
then
  Authenticating.authenticate (session)
```

### Returns.Balance#2

Authored path: `Returns.Balance`.
- Covered by [Returns](../design/compositions/Returns.md), line 4.
- Covered by [Returns](../design/compositions/Returns.md), line 60.

```reaction
when Authenticating.authenticate (session, user), asked by Returns.Balance
then
  ContributionRewarding.balance (user)
```

### Returns.Balance#3

Authored path: `Returns.Balance`.
- Covered by [Returns](../design/compositions/Returns.md), line 4.
- Covered by [Returns](../design/compositions/Returns.md), line 60.

```reaction
when ContributionRewarding.balance (user, points), asked by Returns.Balance#2
where
  earlier, RequestBoundary.request (path: "/returns/balance", requestId, session)
then
  RequestBoundary.respond (points, requestId)
```

### Returns.Begin

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when RequestBoundary.request (conversation, path: "/returns/begin", requestId, session)
then
  Authenticating.authenticate (session)
```

### Returns.Begin#2

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when Authenticating.authenticate (session, user), asked by Returns.Begin
where
  earlier, RequestBoundary.request (conversation, path: "/returns/begin", requestId, session)
then
  ConversationLinking.get (conversation)
```

### Returns.Begin#3

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
then
  ItemReporting.returnInfo (report)
```

### Returns.Begin#4

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ItemReporting.returnInfo (report, author: recipient), asked by Returns.Begin#3
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
then
  Messaging.checkParticipants (conversation, first: recipient, second: contributor)
```

### Returns.Begin#5

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when Messaging.checkParticipants (conversation, first: recipient, second: contributor), asked by Returns.Begin#4
where
  earlier, Authenticating.authenticate (session, user), asked by Returns.Begin
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
then
  ContributionRewarding.register (contribution: report, contributor, recipient, user)
```

### Returns.Begin#6

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
then
  ConversationLinking.source (conversation)
```

### Returns.Begin:completedWithSavedRecord#10

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ItemReporting.closeFound (author: contributor, report: source), asked by Returns.Begin:completedWithSavedRecord#9
then
  Matching.remove (record: source)
```

### Returns.Begin:completedWithSavedRecord#11

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when Matching.remove (record: source), asked by Returns.Begin:completedWithSavedRecord#10
where
  earlier, ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
  earlier, RequestBoundary.request (conversation, path: "/returns/begin", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Begin:completedWithSavedRecord#7

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Begin#6
where
  hasSource is among [true]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Begin#3
  earlier, ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Begin:completedWithSavedRecord#8

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Begin:completedWithSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Begin:completedWithSavedRecord#9

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when Matching.remove (record: report), asked by Returns.Begin:completedWithSavedRecord#8
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
  earlier, ConversationLinking.source (conversation, hasSource, source), asked by Returns.Begin#6
then
  ItemReporting.closeFound (author: contributor, report: source)
```

### Returns.Begin:completedWithoutSavedRecord#7

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Begin#6
where
  hasSource is among [false]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Begin#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Begin#3
  earlier, ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Begin:completedWithoutSavedRecord#8

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Begin:completedWithoutSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Begin:completedWithoutSavedRecord#9

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when Matching.remove (record: report), asked by Returns.Begin:completedWithoutSavedRecord#8
where
  earlier, ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
  earlier, RequestBoundary.request (conversation, path: "/returns/begin", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Begin:pending#7

Authored path: `Returns.Begin`.
- Covered by [Returns](../design/compositions/Returns.md), line 37.
- Covered by [Returns](../design/compositions/Returns.md), line 57.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Begin#6
where
  earlier, ContributionRewarding.register (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Begin#5
  rewarded is among [false]
  earlier, RequestBoundary.request (conversation, path: "/returns/begin", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Confirm

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when RequestBoundary.request (conversation, path: "/returns/confirm", requestId, session)
then
  Authenticating.authenticate (session)
```

### Returns.Confirm#2

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when Authenticating.authenticate (session, user), asked by Returns.Confirm
where
  earlier, RequestBoundary.request (conversation, path: "/returns/confirm", requestId, session)
then
  ConversationLinking.get (conversation)
```

### Returns.Confirm#3

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
then
  ItemReporting.returnInfo (report)
```

### Returns.Confirm#4

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ItemReporting.returnInfo (report, author: recipient), asked by Returns.Confirm#3
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
then
  Messaging.checkParticipants (conversation, first: recipient, second: contributor)
```

### Returns.Confirm#5

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when Messaging.checkParticipants (conversation, first: recipient, second: contributor), asked by Returns.Confirm#4
where
  earlier, Authenticating.authenticate (session, user), asked by Returns.Confirm
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
then
  ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user)
```

### Returns.Confirm#6

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
then
  ConversationLinking.source (conversation)
```

### Returns.Confirm:completedWithSavedRecord#10

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ItemReporting.closeFound (author: contributor, report: source), asked by Returns.Confirm:completedWithSavedRecord#9
then
  Matching.remove (record: source)
```

### Returns.Confirm:completedWithSavedRecord#11

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when Matching.remove (record: source), asked by Returns.Confirm:completedWithSavedRecord#10
where
  earlier, ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
  earlier, RequestBoundary.request (conversation, path: "/returns/confirm", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Confirm:completedWithSavedRecord#7

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Confirm#6
where
  hasSource is among [true]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Confirm#3
  earlier, ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Confirm:completedWithSavedRecord#8

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Confirm:completedWithSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Confirm:completedWithSavedRecord#9

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when Matching.remove (record: report), asked by Returns.Confirm:completedWithSavedRecord#8
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
  earlier, ConversationLinking.source (conversation, hasSource, source), asked by Returns.Confirm#6
then
  ItemReporting.closeFound (author: contributor, report: source)
```

### Returns.Confirm:completedWithoutSavedRecord#7

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Confirm#6
where
  hasSource is among [false]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Confirm#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Confirm#3
  earlier, ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Confirm:completedWithoutSavedRecord#8

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Confirm:completedWithoutSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Confirm:completedWithoutSavedRecord#9

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when Matching.remove (record: report), asked by Returns.Confirm:completedWithoutSavedRecord#8
where
  earlier, ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
  earlier, RequestBoundary.request (conversation, path: "/returns/confirm", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Confirm:pending#7

Authored path: `Returns.Confirm`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 58.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Confirm#6
where
  earlier, ContributionRewarding.acknowledge (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Confirm#5
  rewarded is among [false]
  earlier, RequestBoundary.request (conversation, path: "/returns/confirm", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Status

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when RequestBoundary.request (conversation, path: "/returns/status", requestId, session)
then
  Authenticating.authenticate (session)
```

### Returns.Status#2

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when Authenticating.authenticate (session, user), asked by Returns.Status
where
  earlier, RequestBoundary.request (conversation, path: "/returns/status", requestId, session)
then
  ConversationLinking.get (conversation)
```

### Returns.Status#3

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
then
  ItemReporting.returnInfo (report)
```

### Returns.Status#4

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ItemReporting.returnInfo (report, author: recipient), asked by Returns.Status#3
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
then
  Messaging.checkParticipants (conversation, first: recipient, second: contributor)
```

### Returns.Status#5

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when Messaging.checkParticipants (conversation, first: recipient, second: contributor), asked by Returns.Status#4
where
  earlier, Authenticating.authenticate (session, user), asked by Returns.Status
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
then
  ContributionRewarding.status (contribution: report, contributor, recipient, user)
```

### Returns.Status#6

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
then
  ConversationLinking.source (conversation)
```

### Returns.Status:completedWithSavedRecord#10

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ItemReporting.closeFound (author: contributor, report: source), asked by Returns.Status:completedWithSavedRecord#9
then
  Matching.remove (record: source)
```

### Returns.Status:completedWithSavedRecord#11

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when Matching.remove (record: source), asked by Returns.Status:completedWithSavedRecord#10
where
  earlier, ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
  earlier, RequestBoundary.request (conversation, path: "/returns/status", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Status:completedWithSavedRecord#7

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Status#6
where
  hasSource is among [true]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Status#3
  earlier, ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Status:completedWithSavedRecord#8

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Status:completedWithSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Status:completedWithSavedRecord#9

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when Matching.remove (record: report), asked by Returns.Status:completedWithSavedRecord#8
where
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
  earlier, ConversationLinking.source (conversation, hasSource, source), asked by Returns.Status#6
then
  ItemReporting.closeFound (author: contributor, report: source)
```

### Returns.Status:completedWithoutSavedRecord#7

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Status#6
where
  hasSource is among [false]
  earlier, ConversationLinking.get (conversation, context: report, initiator: contributor), asked by Returns.Status#2
  earlier, ItemReporting.returnInfo (report, author: recipient), asked by Returns.Status#3
  earlier, ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
  rewarded is among [true]
then
  ItemReporting.close (author: recipient, report)
```

### Returns.Status:completedWithoutSavedRecord#8

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ItemReporting.close (author: recipient, report), asked by Returns.Status:completedWithoutSavedRecord#7
then
  Matching.remove (record: report)
```

### Returns.Status:completedWithoutSavedRecord#9

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when Matching.remove (record: report), asked by Returns.Status:completedWithoutSavedRecord#8
where
  earlier, ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
  earlier, RequestBoundary.request (conversation, path: "/returns/status", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

### Returns.Status:pending#7

Authored path: `Returns.Status`.
- Covered by [Returns](../design/compositions/Returns.md), line 3.
- Covered by [Returns](../design/compositions/Returns.md), line 59.

```reaction
when ConversationLinking.source (conversation, hasSource, source), asked by Returns.Status#6
where
  earlier, ContributionRewarding.status (contribution: report, contributor, recipient, user, rewarded, status), asked by Returns.Status#5
  rewarded is among [false]
  earlier, RequestBoundary.request (conversation, path: "/returns/status", requestId, session)
then
  RequestBoundary.respond (requestId, status)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/current` — requires `session`
- `/auth/login` — requires `username`, `password`
- `/auth/logout` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/messages/list` — requires `session`
- `/messages/read` — requires `session`, `conversation`
- `/messages/send` — requires `session`, `conversation`, `text`
- `/messages/start` — requires `session`, `report`, `attributes`
- `/messages/start-saved` — requires `session`, `report`, `foundReport`
- `/reports/close` — requires `session`, `report`
- `/reports/create` — requires `session`, `title`, `kind`, `attributes`
- `/reports/list` — requires `session`
- `/reports/matches` — requires `session`, `report`
- `/reports/search` — requires `session`, `attributes`
- `/reports/update` — requires `session`, `report`, `title`, `attributes`
- `/returns/balance` — requires `session`
- `/returns/begin` — requires `session`, `conversation`
- `/returns/confirm` — requires `session`, `conversation`
- `/returns/status` — requires `session`, `conversation`
