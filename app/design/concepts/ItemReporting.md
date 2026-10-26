# ItemReporting

## Purpose

Store private item reports that their authors can review, edit, and close.

## Principle

A user creates a missing report or a found record and sees it in their own list.
The author can replace an open report's title and characteristics.
Other users do not see it in their lists and cannot edit or close it.
Closed reports remain read-only.
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

update (author: User, report: Report, title: String, attributes: Attributes) : returns (report: Report)
  where title is blank or longer than 120 characters, or attributes are invalid
  then
    refuses INVALID_REPORT "Check the report fields and time interval."
  where report does not exist, is closed, or author is not its author
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report is open, author is its author, and title and attributes are valid
  then
    replace its title with trimmed title and its attributes with the supplied attributes
    trim colors, brand, and locations as on create
    preserve its author, kind, identity, and open status
    returns report

close (author: User, report: Report) : returns (report: Report)
  where report does not exist or author is not its author
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report exists and author is its author
  then
    set its open flag to false
    returns report

readFound (author: User, report: Report) : returns (attributes: Attributes)
  where report does not exist, is closed, is not found, or is not authored by author
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report is open, found, and authored by author
  then
    bind attributes to the report's attributes
    returns attributes

returnInfo (report: Report) : returns (author: User, open: Flag)
  where report does not exist or is found
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report is missing, including legacy records without kind
  then
    bind author and open to its values, including when closed
    returns author, open

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
_title (report: Report) : optional (title: String)
  answers the current title of an existing report, including closed reports
  answers no rows for an unknown report

_own (author: User) : many (report: Report, title: String, kind: String, attributes: Attributes, open: Flag)
  answers all reports authored by author, including closed reports
  records stored without a kind answer kind missing
  answers no rows when the author has no reports

_summary (report: Report, requester: User) : optional (title: String, category: String, start: String, end: String, locations: Locations)
  answers a limited summary only for an open missing report authored by someone other than requester
  records stored without a kind are treated as missing
  answers no rows for self-authored, found, closed, or nonexistent reports
```
