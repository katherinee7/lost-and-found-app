# ContributionRewarding

## Purpose

Recognize jointly confirmed contributions with one point each.

## Principle

Either participant can acknowledge a contribution first. A contributor's early
confirmation is an intention, not a reservation: the recipient selects the
contributor by acknowledging. Both confirmations yield one point per contribution.
Existing recipient registrations and confirmations remain valid. Repeated and
concurrent actions cannot duplicate points. This concept knows nothing about
reports or conversations.

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

acknowledge (user: User, contribution: Contribution, contributor: User, recipient: User) : returns (status: Status, rewarded: Flag, recipient: User)
  where contributor equals recipient
  then
    refuses INVALID_CONTRIBUTION "A contribution needs two distinct participants."
  where user is neither contributor nor recipient
  then
    refuses CONTRIBUTION_UNAVAILABLE "That contribution is unavailable to you in this context."
  where an entry selects different participants
  then
    refuses CONTRIBUTION_CONFLICT "This contribution is registered with another participant."
  where participants differ and user is one of them and any selection agrees
  then
    record this user's intention for the pair
    if user is recipient, atomically select the pair if not already selected
    if selected, merge pair intentions into confirmations and reward exactly when both confirmed
    otherwise preserve the unselected contributor intention without awarding
    bind status and rewarded to the current pair state
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
    preserve all entries; report pair intentions when not selected, or false flags when no intention exists
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
