# Application types

Report authors are the user identities managed by Authenticating.

```instances
instantiate Authenticating

instantiate ItemReporting with
  User is Authenticating.User

instantiate Matching with
  Record is ItemReporting.Report

instantiate Messaging with
  User is Authenticating.User

instantiate ConversationLinking with
  User is Authenticating.User
  Context is ItemReporting.Report
  Conversation is Messaging.Conversation

instantiate ContributionRewarding with
  User is Authenticating.User
  Contribution is ItemReporting.Report
```
