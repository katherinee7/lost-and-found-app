# Return recognition: manual check

Use owner, finder, and outsider accounts in separate browser profiles.

1. Owner creates a missing report. Finder searches, contacts the owner, and
   optionally saves a found record. Both open the report-linked conversation.
2. Owner selects **Start return confirmation**. Finder cannot initiate. Each
   sees the two confirmation states. The first confirmation leaves points at 0.
3. The other participant confirms. Finder's total increases by exactly 1;
   missing report closes and leaves matching. Saved found record stays open
   until the finder closes it separately. Refresh/reload and confirm the point
   total, status, and existing messages remain.
4. Repeat requests or confirm from both browser windows at once. Total remains
   1. Another finder’s conversation about this report cannot replace the chosen
   finder or earn another point. Outsiders cannot view or confirm this return.
5. On a second report, start confirmation and then manually close the report.
   No point is awarded by closing. The registered pair can still finish and earn
   1 point. Owners may also start a later acknowledgement from a closed linked
   report. Unlinked legacy conversations keep messages but have no start action.

Automated coverage: ContributionRewarding.test.ts and Returns.test.ts include
concurrent registration/confirmations across instances, forged participant IDs,
manual closure, persistence, and injected failures after reward completion but
before report closure or Matching removal. Retrying status completes both
closure steps without another point. Expected injected errors appear in the
saved final test output. Browser validation of the main two-account journey and
mobile accessibility is recorded in [returns-browser.txt](results/returns-browser.txt).

Points are recognition only. There is no leaderboard, prize, or redemption.
