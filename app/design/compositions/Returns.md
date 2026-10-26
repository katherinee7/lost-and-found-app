# Returns

Users can [begin return confirmation](reaction:Returns.Begin),
[confirm a return](reaction:Returns.Confirm), [read its status](reaction:Returns.Status),
and [read their point total](reaction:Returns.Balance).

Each request authenticates its session. Conversation requests accept only session
and conversation ID. The composition obtains report and finder from
ConversationLinking.get, obtains owner from ItemReporting.returnInfo, and checks
that Messaging contains exactly the owner and finder. ContributionRewarding
then enforces the acting user's role. Client participant IDs and report IDs are
never used for registration or confirmation. Unlinked legacy conversations
cannot start confirmations, but remain available for ordinary messaging.

Begin is owner-only and registers the missing report ID as the contribution.
Registration is idempotent for the same owner/finder and rejects a different
finder, including one from another valid conversation about the same report.
Both participants must subsequently confirm; starting does not count as a
confirmation. A missing report may already be closed when the owner starts,
and registered participants may finish after any manual closure. Closure alone
never registers, confirms, or awards a contribution. Saved found records are
closed separately by their authors.

ContributionRewarding is independent of reports and messaging. Its unique
contribution entry contains immutable participants and atomically updated
confirmations/completion. Balance counts completed entries rather than
incrementing a separate counter, so each missing report contributes at most one
point under retries, concurrency, and application restarts.

Begin, Confirm, and Status branch on the action's returned rewarded flag (not
mutable standing state). If complete, they idempotently close the missing report
and remove its Matching entry before replying. Otherwise they reply with pending
status. If either closure step fails after reward completion, the durable reward
entry is retained and any repeated confirm, begin, or status request retries
both steps. No in-memory event must survive a crash. Status is therefore also a
repair operation for completed returns. A finder cannot replace the registered
finder by using a different conversation. Existing read/send access is unaffected.

The conversation UI shows who has confirmed, an owner-only start action, and a
confirmation action for each registered participant. Conflicts from other
finder conversations display an explanation without replacing the registration.
The logged-in user sees their balance and the text:
"Earn 1 point per jointly confirmed return."

```endpoints
Returns.Begin at /returns/begin
Returns.Confirm at /returns/confirm
Returns.Status at /returns/status
Returns.Balance at /returns/balance
```
