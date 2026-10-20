# Reports

A signed-in user can [create a missing report](reaction:Reports.Create),
[list their own reports](reaction:Reports.List),
and [close their own report](reaction:Reports.Close).

Every endpoint authenticates the session before performing report operations.
The author comes from the authenticated session, never from a client-supplied
author field.

The [own reports former](former:Reports.OwnReports) formats the authenticated
author's reports, including their open or closed status.

Users can [search for potential owners](reaction:Reports.Search).
The request is authenticated before searching.
The [search results former](former:Reports.SearchResults) joins compatible
record IDs from Matching with limited summaries of open reports.

Creating a report registers its characteristics with Matching before responding.
Closing a report removes its matching entry before responding.
Search results omit full report attributes and author identities.

```endpoints
Reports.Create at /reports/create
Reports.List at /reports/list
Reports.Close at /reports/close
Reports.Search at /reports/search
```
