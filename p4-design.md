# Backtrack: P4 final design

## Final functionality and responsibilities

- Owners create private missing reports; finders search or save found records
  privately for later matching. Authors edit open records and close either kind.
  Participants message, arrange a handoff, and jointly confirm a return, awarding
  the finder one point per missing report.
- **Authenticating** identifies users through sessions; **ItemReporting** manages
  report content and lifecycle; **Matching** checks compatibility; **Messaging**
  provides participant-only communication; **ConversationLinking** associates
  conversations with finder/report pairs; **ContributionRewarding** records
  confirmations and points. Sync-engine compositions coordinate these independent
  concepts and enforce authorization. [Current specifications](app/design/).

## Significant decisions since P1

The [P1 specification at its design commit](https://github.com/katherinee7/lost-and-found-app/blob/4ee4691209cc2e0300ca04f1e653777d992da5e0/design.md)
is the baseline; several features complete rather than replace that proposal.

- **Saved found records preserve a search.** Save for later stores characteristics
  privately, allowing a finder to return after an owner submits a missing report.
  Found records never appear as potential owners. Existing missing reports
  continue working without a data reset.
- **Later matches are refreshed, not notified.** P1 proposed stored compatible
  pairs and alerts. Current counts instead come from compatible open missing
  reports on load or Refresh matches, excluding the finder's own reports.
  Recomputing avoids maintaining stale pairs and counters after edits or closure.
  Counts are snapshots, not notifications; finders must revisit the app.
  Category and time overlap are required, while supplied colors, brand, and
  locations further constrain compatibility.
- **Conversations are reused and labeled.** P1 created a conversation for each
  contact. ConversationLinking now reserves one per finder/missing-report pair,
  including concurrent requests, preventing fragmented histories. The composition
  supplies report titles and usernames while Messaging stays report-independent.
  Closing a report preserves its conversations.
- **Contact requires current compatibility.** The backend rechecks the open
  missing report and Matching rules rather than trusting a visible button or
  report ID. Saved-record contact uses the authenticated finder's stored
  characteristics, preventing substitution of different details.
- **Joint confirmation recognizes one return.** P1's points idea provides
  recognition; its effect on motivation has not been evaluated. Each participant
  confirms once, in either order. A finder's early confirmation cannot reserve
  the owner's choice. Both confirmations award one point per missing report and
  close it plus the conversation's explicitly linked saved found record, if any.
  This completes P1's automatic closure journey without guessing associations:
  direct searches may have no saved record. Manual closing awards nothing and
  still permits later confirmation.

## P3 visual ideas and final adjustments

The [P3 visual study at its recorded commit](https://github.com/katherinee7/lost-and-found-app/blob/25ec74dfddaf139a786548f219964b4c4ee2da54/images/visual_study.pdf)
explores typography hierarchy and contrasting color for emphasis and feedback.

- **Applied:** prominent serif page headings and smaller supporting card text
  establish hierarchy. Green identifies primary/selected actions; red plus
  explanatory text identifies errors. Shared forms and responsive cards keep
  the treatment consistent. Integrating text into imagery was an exploration
  in the study; the final working interface uses text and cards for readability.
- **Adjusted:** My Missing Reports now focuses on missing items; Find an Owner
  contains search and Saved found items. This follows intent instead of grouping
  everything under My Reports. Short descriptions replace repeated introductions.
- **Reduced distractions:** Show closed hides completed work initially. Closing
  requires a cancellable dialog explaining its consequences. Return confirmation
  is collapsed below the reply box, with a visible next-actor status and buttons
  saying I received my item or I returned the item. This keeps messaging primary
  and makes each participant's action explicit.

## Validation and limitations

- **Local automated:** [standard](app/tests/results/final-tests.txt) and
  [randomized](app/tests/results/final-tests-randomized.txt) runs each report
  70 passing tests and 490 assertions. Coverage includes concept isolation,
  ownership, compatibility, concurrent confirmations, persistence across
  instances, automatic linked-record closure, and recovery after failures.
- **Browser checks:** the [two-account journey](app/tests/results/two-confirmations-browser.txt)
  used real local endpoints and an isolated temporary database, verifying both
  confirmation orders, closure, reload persistence, and continued messaging.
  Checks at 1280/360/320px found no overflow or automated WCAG A/AA violations.
  The latest [confirmation-feedback checks](app/tests/results/return-copy.txt)
  used mocked responses to verify concise states and the finder-only points
  banner. These results are local, not deployed test evidence.
- **Manual verification:** the author completed the return-workflow checks,
  covering both confirmation orders, point limits, linked versus unrelated
  records, persistence, restricted access, competing finders, manual closure,
  and existing conversations. The test environment was not recorded here;
  no additional deployed results or user-study findings are claimed.
- **Limitations:** compatibility suggests candidates, not verified ownership;
  participants assess claims through conversation. There are no background
  match alerts, reopening, or deletion. Conversations without an explicit saved
  association cannot automatically close a found record. Whether new users can
  discover saved matches and complete returns without guidance remains a
  usability question; points have not been shown to improve participation.
