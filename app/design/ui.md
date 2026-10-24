# Backtrack interface

## Visual direction

Use a warm paper background, white cards, dark forest green, and restrained
borders. Georgia headings give the application a recognizable wordmark and
page hierarchy; system sans-serif body text and controls stay readable without
loading external fonts. Green highlights primary actions and selected views.
Red identifies errors and closing actions, with text explaining their meaning.

Shared tokens and layout rules live in `web/src/style.css`. Report creation,
editing, and finder search all use `ReportFields.vue`; finder search omits the
title field. Labels identify optional fields, comma-separated lists, required
fields, and the local timezone used by date inputs. Native form validation is
retained alongside backend validation. Browser tab title and favicon identify
Backtrack instead of the starter template.

## Navigation and layout

- Keep My Reports, Find an Owner, and Messages visible in a named main navigation.
  Selected buttons expose aria-pressed and use a filled green style.
- After navigation, move keyboard focus to the new page heading. Provide a
  keyboard-visible Skip to content link and a mobile Jump to your records link.
- On wide screens, show report/search forms beside records/results. Messages
  uses a conversation list beside the thread. Below 800px, stack these areas
  in DOM order. Shared form fields stack below 1100px to keep date controls usable.
- Controls have at least 44px height, a visible amber focus outline, and wrapping
  labels. Cards, dates, and conversation titles must fit a 320px viewport.
- Editing focuses the prefilled title. Cancel and successful save return focus
  to the record's Edit action. Disable conflicting record actions while editing
  or saving; do not discard an edit draft during a list refresh.

## Loading, feedback, and empty states

Loading is distinct from an empty result. Show loading text during initial
report/conversation fetches, search, save, and message reads. Disable duplicate
submissions while requests run and label the active action. Use polite status
announcements for loading/success and alerts for errors; success and errors
have different colors as well as explicit text. Failed lists must not claim
that there are no records. A failed match lookup must not show a zero count.

Empty screens explain what to do next: create a missing report, search/save a
found item, contact an owner, or choose a conversation. No-match results explain
saving and checking later. Closed records explain that they are read-only and
that existing conversations remain available. Conversation send errors persist
independently of background list refreshes. Message input has an explicit label
and character-limit help. Expanded match buttons expose their controlled region.

Matching remains refreshed on load/manual refresh. Existing Messages polling
is retained. Styling adds no new notifications or backend contracts.

## Contrast checks

Calculated contrast ratios for the actual colors:

| Foreground / background | Ratio |
| --- | --- |
| Body #243b30 / paper #f5f4ed | 10.93:1 |
| Secondary text #53645c / paper #f5f4ed | 5.69:1 |
| White / primary green #174d3b | 9.72:1 |
| Error #922d25 / error background #fff0ed | 7.22:1 |
| Input border #718478 / white | 3.98:1 |
| Focus #a45b00 / paper #f5f4ed | 4.67:1 |

## Verification

Production-preview browser checks used headless Google Chrome, Playwright
1.64.1, and axe-core Playwright 4.14.0, installed temporarily outside the repo.
The preview used a separate temporary MongoDB database. Existing application
accounts and records were not changed.

Checked registration/login, report creation, prefilled editing and cancel/save,
invalid search intervals, owner search, save found record, current match count,
viewing matches, contact, and sending a message. Keyboard checks covered the
skip link, Enter on navigation, focus on page headings, focus restoration after
cancel, and the mobile records shortcut. Delayed/failed list requests showed
loading and error states without a misleading empty list. No JavaScript page
errors or horizontal overflow were observed at 1440, 360, or 320px widths.

The 12 scanned desktop/mobile states had no automated WCAG A/AA violations.
See [browser output](../tests/results/ui-polish.txt) and
[regression output](../tests/results/ui-regression.txt). Automated scans and
keyboard checks do not replace testing with a screen reader or with users.

Screenshots show synthetic test data:

- [Login, desktop](../../images/p3/login-desktop.png)
- [Saved records, desktop](../../images/p3/reports-desktop.png)
- [Messages, desktop](../../images/p3/messages-desktop.png)
- [Saved records, mobile](../../images/p3/reports-mobile.png)

The P3 two-slide typography/color inspiration study is a separate deliverable;
these implementation notes and screenshots do not replace that study.
