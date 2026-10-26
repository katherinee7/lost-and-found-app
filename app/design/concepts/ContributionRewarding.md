# ContributionRewarding

## Purpose

Recognize jointly confirmed contributions with one point each.

## Principle

A recipient registers a contribution with a distinct contributor. Only those
participants can confirm it. Both confirmations complete the contribution and
award its contributor one point, at most once. Repeated and concurrent actions
preserve the original participants and cannot duplicate points. Entries and
confirmations persist across application instances. This concept knows nothing
about reports, conversations, or their lifecycle.

## Types

```types
external User
  A participant identity supplied by the application.
external Contribution
  A contribution identity supplied by the application.
opaque Status
  An object with registered, contributorConfirmed, recipientConfirmed, and
  rewarded boolean flags, and role equal to contributor or recipient relative to the requesting user.
```

## State

```state
a set of Entries with
  a unique contribution Contribution
  a contributor User
  a recipient User
  a confirmations set of User
  a rewarded Flag
  Rule: contributor and recipient differ and never change after registration.
  Rule: rewarded is true exactly when both registered participants confirmed.
  Rule: a user's balance is the number of rewarded entries with that contributor.
```

## Actions

```actions
register (user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)
  where contributor equals recipient
  then
    refuses INVALID_CONTRIBUTION "A contribution needs two distinct participants."
  where user is not recipient
  then
    refuses CONTRIBUTION_UNAVAILABLE "Only the recipient can register this contribution."
  where contribution exists with different participants
  then
    refuses CONTRIBUTION_CONFLICT "This contribution is registered with another participant."
  where contribution is new and user is recipient and participants differ
  then
    register the contribution with these participants, no confirmations, and rewarded false
    bind status and rewarded to its current values
    returns status, rewarded, recipient
  where contribution exists with the same participants and user is recipient
  then
    preserve its confirmations and rewarded flag
    bind status and rewarded to its current values
    returns status, rewarded, recipient

confirm (user: User, contribution: Contribution, contributor: User) : returns (status: Status, rewarded: Flag, recipient: User)
  where contribution is unknown, its contributor differs from contributor, or user is not a registered participant
  then
    refuses CONTRIBUTION_UNAVAILABLE "That contribution is unavailable to you in this context."
  where user is a registered participant and contributor agrees
  then
    atomically add user to confirmations and set rewarded to whether both participants have confirmed
    bind status and rewarded to its current values
    returns status, rewarded, recipient

status (user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)
  where contributor equals recipient
  then
    refuses INVALID_CONTRIBUTION "A contribution needs two distinct participants."
  where user is neither contributor nor recipient
  then
    refuses CONTRIBUTION_UNAVAILABLE "That contribution is unavailable to you in this context."
  where an entry exists with different participants
  then
    refuses CONTRIBUTION_CONFLICT "This contribution is registered with another participant."
  where participants differ, user is one of them, and any existing entry agrees
  then
    bind status and rewarded to its current values
    preserve all entries and use false flags when not registered
    returns status, rewarded, recipient

balance (user: User) : returns (points: Number)
  where true
  then
    count rewarded entries with contributor user
    returns points
```

## Queries

```queries
```
