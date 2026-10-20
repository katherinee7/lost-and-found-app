# ItemReporting

## Purpose

Store private item reports that their authors can review and close.

## Principle

A user creates a missing-item report and sees it in their own list.
Other users do not see it in their lists and cannot close it.
Closing a report preserves its information but marks it closed.

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
  an attributes Attributes
  an open Flag
```

## Actions

```actions
create (author: User, title: String, attributes: Attributes) : returns (report: Report)
  where title is blank or longer than 120 characters, or attributes are invalid
  then
    refuses INVALID_REPORT "Check the report fields and time interval."
  where title and attributes are valid
  then
    add an open report with author, trimmed title, and attributes
    returns report

close (author: User, report: Report) : returns (report: Report)
  where report does not exist or author is not its author
  then
    refuses REPORT_UNAVAILABLE "That report is unavailable."
  where report exists and author is its author
  then
    set its open flag to false
    returns report
```

## Queries

```queries
_own (author: User) : many (report: Report, title: String, attributes: Attributes, open: Flag)
  answers all reports authored by author, including closed reports
  answers no rows when the author has no reports

_summary (report: Report) : optional (title: String, category: String, start: String, end: String, locations: Locations)
```
