# Return recognition: manual check

Use owner, finder, and outsider accounts in separate browser profiles.

1. Owner creates a missing report. Finder saves a compatible found item, opens
   Saved found items → View matches, and selects Contact owner from that record.
2. Both open Confirm return below the reply box. Finder selects I returned the
   item. Points stay at 0; the summary says Waiting for owner. Reload and confirm
   this state persists. There is no separate start step.
3. Owner selects I received my item. Finder earns exactly 1 point. Both the
   missing report and linked found record close and leave matching; unrelated
   found records stay open. Use Show closed to review. Reload both accounts;
   messages, confirmation and points persist. Messaging still works.
4. Repeat with the owner confirming first. Also try simultaneous confirmations
   in two windows; each participant confirms once and the finder earns only 1.
5. Let a different finder confirm first in another conversation, then have the
   owner confirm with the intended finder. The early finder must not reserve
   the return or receive a point. Outsiders cannot read or confirm the return.
6. Contact from a direct search with no saved association: joint confirmation
   closes only the missing report. It must not guess a found record to close.
   Existing conversations can acquire a source through Contact owner from a
   saved match; a different source cannot replace an existing association.
7. Manually close a report with one confirmation pending. Closing gives no point;
   the other participant can still confirm, earning 1 and closing the associated
   found record. Also verify direct manual closure without confirmation gives 0.
8. Unlinked legacy conversations remain usable for messages but cannot confirm
   a return. Existing pending/completed returns retain their confirmations.

Automated tests cover both orders, concurrency across assemblies, participant
substitution, source ownership, unchanged unrelated records, persistence, and
repair after injected closure failures. Such deliberate failures appear as
expected error logs in saved execution output. Local/mocked browser checks are
not proof of deployed behavior; run this checklist against the final deployment.
Points are recognition only, without leaderboards, prizes or redemption.
