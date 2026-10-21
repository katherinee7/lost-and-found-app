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
```
