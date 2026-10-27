# Returns

Users [confirm a return](reaction:Returns.Confirm), [read its status](reaction:Returns.Status),
and [read their point total](reaction:Returns.Balance).

## Authentication and participant selection

Requests accept session and conversation, never trusted participant/report IDs.
The composition authenticates, reads the report and finder from ConversationLinking,
reads the owner from ItemReporting.returnInfo, and checks the exact two Messaging
participants. Unlinked legacy conversations remain usable for messages but cannot
confirm returns.

Either participant confirms once using ContributionRewarding.acknowledge. The
finder's first confirmation is an intention for that pair, not a reservation of
the report. Only the owner's confirmation selects the finder; other finders'
early confirmations cannot block that choice. Concurrent owner confirmations for
different finders select at most one pair. Existing owner registrations and
confirmations retain their meaning. Repeated requests cannot award again.

## Automatic closure and retry

Messages.StartSaved validates the finder's owned open found record and current
compatibility, then attaches that record as the conversation's source. An existing
conversation can acquire a source, but a different source cannot replace it.
Direct searches have no source unless explicitly linked by a later saved contact.
Older associations are not guessed or inferred from matching attributes.

After both confirm, the composition closes the missing report and removes it
from Matching. If a source is linked, ItemReporting.closeFound requires that it
be a found record owned by the finder; it too is closed and removed from Matching.
Unrelated records remain open. Manual close awards nothing; either participant
may confirm after manual closing. Missing and source closing are idempotent.

Reward state persists before closure. Confirm and Status retry every closure
step after completion, repairing partial failures without awarding a second
point. The retained [legacy owner-only Begin endpoint](reaction:Returns.Begin) can register a pair for
older clients; it is not used by the current UI and is not required to confirm.
Its completed branch uses the same closure repair steps.

## Interface

An expandable Confirm return section follows the message composer. Either user
can select I received my item (owner) or I returned the item (finder), once, in
either order. The summary shows whose confirmation remains or Return complete.
The expanded pending section contains the role-specific confirmation button and
one short note: Once you both confirm, the linked reports close. After confirming,
the summary says Confirmed and identifies the remaining participant. A finder
who observes pending become complete sees a six-second, nonblocking Item returned!
+1 point status banner outside the collapsed section. Initial reads of already
completed returns do not show the banner; polling does not repeat it.
Both confirmations award one point and close associated reports; a direct search
may have no associated saved report. Point totals say:
"Earn 1 point per jointly confirmed return."

```endpoints
Returns.Begin at /returns/begin
Returns.Confirm at /returns/confirm
Returns.Status at /returns/status
Returns.Balance at /returns/balance
```
