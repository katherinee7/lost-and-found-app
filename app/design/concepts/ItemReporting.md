# ItemReporting

## Purpose

Store private item reports that their authors can review and close.

## Principle

A user creates a missing report or a found record and sees it in their own list.
Other users do not see it in their lists and cannot close it.
Closing a report preserves its information but marks it closed.

Existing stored reports without a kind are interpreted as missing by every read
and contact operation. No database migration or rewrite is required.

## Types

```types
external User
  The author of a report.

opaque Attributes
  An object containing category, colors, brand, start, end, and locations.
  Category is one of the application's supported categories.
  Colors and locations are arrays of nonempty strings.
  Brand is a string and may be empty.
  Start and end are valid timestamp strings with start no later than end.

opaque Locations
  An array of location strings.
```

## State

```state
a set of Reports with
  an author User
  a title String
  a kind String
  an attributes Attributes
  an open Flag
  Rule: kind is either missing or found; absent stored kinds are interpreted as missing.
```

## Actions

```actions
create (author: User, title: String, kind: String, attributes: Attributes) : returns (report: Report)
  where kind is neither missing nor found, title is blank or longer than 120 characters, or attributes are invalid
  then
    refuses INVALID_REPORT "Check the report fields and time interval."
  where kind, title and attributes are valid
  then
    add an open report with author, kind, trimmed title, and attributes
    returns report

close (author: User, report: Report) : returns (report: Report)
  where report does not exist or author is not its author
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report exists and author is its author
  then
    set its open flag to false
    returns report

contactTarget (requester: User, report: Report) : returns (owner: User)
  where report does not exist, is found, is closed, or belongs to requester
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable or belongs to you."
  where report is missing, open and belongs to another user
  then
    bind owner to the report's author
    returns owner
```

## Queries

```queries
_own (author: User) : many (report: Report, title: String, kind: String, attributes: Attributes, open: Flag)
  answers all reports authored by author, including closed reports
  records stored without a kind answer kind missing
  answers no rows when the author has no reports

_summary (report: Report) : optional (title: String, category: String, start: String, end: String, locations: Locations)
  answers a limited summary only for an open missing report
  records stored without a kind are treated as missing
  answers no rows for found, closed, or nonexistent reports
```
