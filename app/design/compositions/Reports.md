# Reports

A signed-in user can [create a missing report or private found record](reaction:Reports.Create),
[list their own reports](reaction:Reports.List),
[edit their open reports](reaction:Reports.Update),
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
contact targets, even if a caller knows their IDs.

A finder can [retrieve current matches](reaction:Reports.Matches) for an open
saved found record. The endpoint authenticates the session and calls
ItemReporting.readFound to enforce ownership, kind, and open status before
using its stored attributes with the same SearchResults former as finder search.
Both searches exclude the requesting user's own missing reports.
Matching alone determines compatibility; ItemReporting supplies only limited
summaries of open missing reports by other authors. Legacy records without kind
remain eligible as missing reports.

On page load and manual refresh, the frontend requests matches for each open
saved found record and displays the length of each returned match list as its
current potential-match count. View matches reveals those same summaries and
Contact owner uses Messages.StartSaved with the saved found record ID and
target missing report ID, rechecking ownership and compatibility before contact. Closed found records have no match action.
Failed requests show an unavailable state rather than a count of zero. Counts
are not stored. There is no polling, unread tracking, or notification state.

Editing supplies report ID, title, and replacement attributes; kind and author
cannot be changed. Update authenticates the session, calls ItemReporting.update
(which validates content and checks author and open status in the database
operation), then replaces the Matching entry with Matching.register before
responding. Rejected edits leave both concepts unchanged. Both missing and found
records are editable, including legacy missing reports without a stored kind.

The interface prefills a shared form with the author's stored title and
characteristics. Save changes submits the update; Cancel discards the draft.
Closed records show no edit action and the backend rejects their updates.
After saving, the frontend reloads records and saved-found match lists.
Subsequent finder searches and saved-record refreshes use edited attributes.

Creating a report registers its characteristics with Matching before responding.
Closing a report removes its matching entry before responding.
Search results omit full report attributes and author identities.

```endpoints
Reports.Create at /reports/create
Reports.Update at /reports/update
Reports.List at /reports/list
Reports.Close at /reports/close
Reports.Search at /reports/search
Reports.Matches at /reports/matches
```
