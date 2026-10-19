# Authenticating

## Purpose

Identify registered users through login sessions.

## Principle

A user registers with a unique username and password.
Logging in creates a session identifying that user.
Logging out invalidates the session.

## Types

```types
```

## State

```state
a set of Users with
  a unique username String
  a passwordHash String

a set of Sessions with
  a user User
```

## Actions

```actions
register (username: String, password: String) : returns (user: User)
  where username is not 3 to 32 letters, digits, underscores, or hyphens
  then
    refuses INVALID_USERNAME "Use 3–32 letters, numbers, underscores, or hyphens."
  where password is shorter than 8 characters or longer than 128 characters
  then
    refuses WEAK_PASSWORD "Use a password with 8–128 characters."
  where username is already registered
  then
    refuses USERNAME_TAKEN "That username is already registered."
  where username and password are valid and username is unused
  then
    add a user with username and a hash of password
    returns user

login (username: String, password: String) : returns (session: Session)
  where username is unknown or password does not match
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where credentials match
  then
    add a new session for the matching user
    returns session

authenticate (session: Session) : returns (user: User)
  where session does not exist
  then
    refuses UNKNOWN_SESSION "Please log in."
  where session exists
  then
    bind user to the session's user
    returns user

logout (session: Session) : returns (ended: Flag)
  where session does not exist
  then
    refuses UNKNOWN_SESSION "Please log in."
  where session exists
  then
    delete session
    set ended to true
    returns ended
```

## Queries

```queries
```
