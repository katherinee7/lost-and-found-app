# Matching

## Purpose

Identify registered records compatible with supplied characteristics.

## Principle

A record is registered with structured characteristics.
Searching returns compatible records.
Removing a record prevents it from appearing in subsequent searches.

## Types

```types
external Record
  The identity of a record supplied by the application.

opaque Attributes
  An object containing category, colors, brand, start, end, and locations.
  Category and brand are strings.
  Colors and locations are arrays of strings.
  Start and end are valid timestamp strings, with start no later than end.
```

## State

```state
a set of Entries with
  a unique record Record
  an attributes Attributes
```

## Actions

```actions
register (record: Record, attributes: Attributes) : returns (record: Record)
  where attributes are invalid
  then
    refuses INVALID_MATCH_ATTRIBUTES "Invalid matching characteristics."
  where attributes are valid
  then
    add or replace the entry for record with attributes
    returns record

remove (record: Record) : returns (record: Record)
  where true
  then
    remove the entry for record if it exists
    returns record
```

## Queries

```queries
_search (attributes: Attributes) : many (record: Record)
  answers registered records whose categories agree and time intervals overlap
  colors and locations must overlap when both sides supply them
  brands must agree when both sides supply one
  string comparisons ignore capitalization and surrounding spaces
  answers no rows for invalid attributes or when no records match
```
