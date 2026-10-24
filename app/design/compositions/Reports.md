# Reports

A signed-in user can [create a missing report or private found record](reaction:Reports.Create),
[list their own reports](reaction:Reports.List),
and [close their own report](reaction:Reports.Close).

Every endpoint authenticates the session before performing report operations.
The author comes from the authenticated session, never from a client-supplied
author field.

The [own reports former](former:Reports.OwnReports) formats the authenticated
author's reports, including their kind and open or closed status.

Users can [search for potential owners](reaction:Reports.Search).
The request is authenticated before searching.
The [search results former](former:Reports.SearchResults) joins compatible
record IDs from Matching with limited summaries of open missing reports.

The create request supplies kind (missing or found), title, and attributes.
Found records are saved from the current finder-search fields with a title
based on category (for example, Found electronics). They are reviewed in
My Reports under Saved found records, including all entered characteristics
and their open/closed status. Missing reports have a separate list there.
Only the authenticated author can list their full records or close them.
Stored reports without kind are treated as missing. Found records cannot be
contact targets, even if a caller knows their IDs. Later matches and counts
are deferred to the next milestone.

Creating a report registers its characteristics with Matching before responding.
Closing a report removes its matching entry before responding.
Search results omit full report attributes and author identities.

```endpoints
Reports.Create at /reports/create
Reports.List at /reports/list
Reports.Close at /reports/close
Reports.Search at /reports/search
```
