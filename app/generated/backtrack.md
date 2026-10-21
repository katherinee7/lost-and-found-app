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

#### Instances

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 6.

### ItemReporting

Defined in [ItemReporting](../design/concepts/ItemReporting.md), line 1.

#### Actions

- `create(author: User, title: String, attributes: Attributes) : returns (report: Report)`
  - Refuses `INVALID_REPORT`: Check the report fields and time interval.
- `close(author: User, report: Report) : returns (report: Report)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable.
- `contactTarget(requester: User, report: Report) : returns (owner: User)`
  - Refuses `REPORT_UNAVAILABLE`: That report is unavailable or belongs to you.

#### Queries

- `_own(author: User) : many (report: Report, title: String, attributes: Attributes, open: Flag)`
- `_summary(report: Report) : optional (title: String, category: String, start: String, end: String, locations: Locations)`

#### Instances

- `ItemReporting` — instance of `ItemReporting` — [Application types](../design/types.md), line 8.
  - `User` is `Authenticating.User` — [Application types](../design/types.md), line 9.

### Matching

Defined in [Matching](../design/concepts/Matching.md), line 1.

#### Actions

- `register(record: Record, attributes: Attributes) : returns (record: Record)`
  - Refuses `INVALID_MATCH_ATTRIBUTES`: Invalid matching characteristics.
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
- Covered by [Reports](../design/compositions/Reports.md), line 16.

```former
Former "limited summaries of compatible open reports" — inputs (attributes); bindings (report, title, category, start, end, locations); promises exactly one record — forms:
  a record of
    matches: each Matching._search (attributes) has (record: report)
      where ItemReporting._summary (report) has (category, end, locations, start, title)
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
- Covered by [Messages](../design/compositions/Messages.md), line 14.

```former
Former "the authenticated user's conversations" — inputs (user); bindings (conversation, other); promises exactly one record — forms:
  a record of
    conversations: each Messaging._for (user) has (conversation, other)
      form a record of
        conversation
        other
```

### the authenticated user's reports

Authored path: `Reports.OwnReports`.
- Covered by [Reports](../design/compositions/Reports.md), line 11.

```former
Former "the authenticated user's reports" — inputs (author); bindings (report, title, attributes, open); promises exactly one record — forms:
  a record of
    reports: each ItemReporting._own (author) has (attributes, open, report, title)
      form a record of
        attributes
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
- Covered by [Messages](../design/compositions/Messages.md), line 22.

```reaction
when RequestBoundary.request (path: "/messages/list", requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.List#2

Authored path: `Messages.List`.
- Covered by [Messages](../design/compositions/Messages.md), line 7.
- Covered by [Messages](../design/compositions/Messages.md), line 22.

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
- Covered by [Messages](../design/compositions/Messages.md), line 23.

```reaction
when RequestBoundary.request (conversation, path: "/messages/read", requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.Read#2

Authored path: `Messages.Read`.
- Covered by [Messages](../design/compositions/Messages.md), line 8.
- Covered by [Messages](../design/compositions/Messages.md), line 23.

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
- Covered by [Messages](../design/compositions/Messages.md), line 23.

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
- Covered by [Messages](../design/compositions/Messages.md), line 24.

```reaction
when RequestBoundary.request (conversation, path: "/messages/send", requestId, session, text)
then
  Authenticating.authenticate (session)
```

### Messages.Send#2

Authored path: `Messages.Send`.
- Covered by [Messages](../design/compositions/Messages.md), line 9.
- Covered by [Messages](../design/compositions/Messages.md), line 24.

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
- Covered by [Messages](../design/compositions/Messages.md), line 24.

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
- Covered by [Messages](../design/compositions/Messages.md), line 21.

```reaction
when RequestBoundary.request (path: "/messages/start", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Messages.Start#2

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 21.

```reaction
when Authenticating.authenticate (session, user), asked by Messages.Start
where
  earlier, RequestBoundary.request (path: "/messages/start", report, requestId, session)
then
  ItemReporting.contactTarget (report, requester: user)
```

### Messages.Start#3

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 21.

```reaction
when ItemReporting.contactTarget (report, requester: user, owner), asked by Messages.Start#2
then
  Messaging.create (first: user, second: owner)
```

### Messages.Start#4

Authored path: `Messages.Start`.
- Covered by [Messages](../design/compositions/Messages.md), line 3.
- Covered by [Messages](../design/compositions/Messages.md), line 21.

```reaction
when Messaging.create (first: user, second: owner, conversation), asked by Messages.Start#3
where
  earlier, RequestBoundary.request (path: "/messages/start", report, requestId, session)
then
  RequestBoundary.respond (conversation, requestId)
```

### Reports.Close

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 26.

```reaction
when RequestBoundary.request (path: "/reports/close", report, requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.Close#2

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 26.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.Close
where
  earlier, RequestBoundary.request (path: "/reports/close", report, requestId, session)
then
  ItemReporting.close (author, report)
```

### Reports.Close#3

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 26.

```reaction
when ItemReporting.close (author, report), asked by Reports.Close#2
then
  Matching.remove (record: report)
```

### Reports.Close#4

Authored path: `Reports.Close`.
- Covered by [Reports](../design/compositions/Reports.md), line 5.
- Covered by [Reports](../design/compositions/Reports.md), line 26.

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
- Covered by [Reports](../design/compositions/Reports.md), line 24.

```reaction
when RequestBoundary.request (attributes, path: "/reports/create", requestId, session, title)
then
  Authenticating.authenticate (session)
```

### Reports.Create#2

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 24.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.Create
where
  earlier, RequestBoundary.request (attributes, path: "/reports/create", requestId, session, title)
then
  ItemReporting.create (attributes, author, title)
```

### Reports.Create#3

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 24.

```reaction
when ItemReporting.create (attributes, author, title, report), asked by Reports.Create#2
then
  Matching.register (attributes, record: report)
```

### Reports.Create#4

Authored path: `Reports.Create`.
- Covered by [Reports](../design/compositions/Reports.md), line 3.
- Covered by [Reports](../design/compositions/Reports.md), line 24.

```reaction
when Matching.register (attributes, record: report), asked by Reports.Create#3
where
  earlier, RequestBoundary.request (attributes, path: "/reports/create", requestId, session, title)
then
  RequestBoundary.respond (report, requestId)
```

### Reports.List

Authored path: `Reports.List`.
- Covered by [Reports](../design/compositions/Reports.md), line 4.
- Covered by [Reports](../design/compositions/Reports.md), line 25.

```reaction
when RequestBoundary.request (path: "/reports/list", requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.List#2

Authored path: `Reports.List`.
- Covered by [Reports](../design/compositions/Reports.md), line 4.
- Covered by [Reports](../design/compositions/Reports.md), line 25.

```reaction
when Authenticating.authenticate (session, user: author), asked by Reports.List
where
  earlier, RequestBoundary.request (path: "/reports/list", requestId, session)
then
  RequestBoundary.respond (book: former "the authenticated user's reports" with (author), requestId)
```

### Reports.Search

Authored path: `Reports.Search`.
- Covered by [Reports](../design/compositions/Reports.md), line 14.
- Covered by [Reports](../design/compositions/Reports.md), line 27.

```reaction
when RequestBoundary.request (attributes, path: "/reports/search", requestId, session)
then
  Authenticating.authenticate (session)
```

### Reports.Search#2

Authored path: `Reports.Search`.
- Covered by [Reports](../design/compositions/Reports.md), line 14.
- Covered by [Reports](../design/compositions/Reports.md), line 27.

```reaction
when Authenticating.authenticate (session, user), asked by Reports.Search
where
  earlier, RequestBoundary.request (attributes, path: "/reports/search", requestId, session)
then
  RequestBoundary.respond (requestId, results: former "limited summaries of compatible open reports" with (attributes))
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
- `/messages/start` — requires `session`, `report`
- `/reports/close` — requires `session`, `report`
- `/reports/create` — requires `session`, `title`, `attributes`
- `/reports/list` — requires `session`
- `/reports/search` — requires `session`, `attributes`
