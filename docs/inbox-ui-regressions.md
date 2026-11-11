# Inbox UI regression requirements

Discovered 2026-11-03, before sharing more UI components with chat. Baseline: `A-F-V/add-astra-audit-opencode-go` at `86505928`, **including the existing uncommitted inbox changes**. Reader/canvas work is separate on `A-F-V/reader-canvas`.

The refactor may change appearance and component structure. It must preserve the outcomes below, especially fixes requested after actual use. Reusing a component does not authorize adopting all of chat's behavior. Mentions are optional for inbox; its queue, source capture, drafts, and preferences remain its own.

This is a discovered baseline, not a claim that every historical issue has automated coverage or that the installed plugin currently matches the checkout. The initial compilation made no UI implementation changes; subsequent refactors and verification are recorded below.

## Evidence and coverage

- **User**: explicit request recovered from prior conversation messages, or the current discussion.
- **Test**: an existing checked-in or currently uncommitted test contains relevant assertions. This does not imply complete coverage of every clause in a row.
- **Source**: current implementation establishes the behavior; a dedicated regression assertion may still be missing.
- **Browser history**: an earlier browser check or recorded result; not rerun for this compilation. Browser checks must be repeated against the refactored UI.

Test/source links below are relative to this repository. Historical artifacts in `.context` are supporting evidence, not portable test infrastructure. Keep the stable requirement IDs when adding regression tests; assert user-visible outcomes rather than old class names or markup.

## 1. Visual hierarchy and compactness

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| V01 | Independent questions remain visibly distinct. A thin divider alone was insufficient; the accepted card/bubble treatment gives each question a clear boundary in both themes. The exact radius, color, or border thickness may change. | User, Oct 30: weak hierarchy, accepted design B. Source: [card styling][card]. Browser history: `.context/inbox-hierarchy/`. |
| V02 | Replies visually belong to their parent: the parent-to-reply gap and sibling reply gaps are smaller than the gap to the next independent thread. Nested replies remain distinguishable without consuming all sidebar width. | User, Oct 30: replies looked as close to the next question as to their parent. Source: [reply layout][feed], [feed][feed]. Geometry/visual check needed. |
| V03 | The focused question is readily identifiable, while queued, answering, answered, and failed states remain distinguishable through labels/icons and appropriate visual treatment. Failed questions expose Retry. | User, Oct 22; Source: [card][card], [card styling][card]. |
| V04 | Inputs retain the restrained, neutral chat-like appearance. Do not reintroduce the disliked hover/active textbox treatment or distracting focus animation. Keyboard focus must still be discoverable. | User, Oct 22: “Active/on hover effect for textbox i hate. Keep it like the original chat.” Source: [composer][composer]. Browser review required. |
| V05 | The follow-up composer is compact: its send button stays to the right of the input on the same row. Errors can appear beneath it. Do not add a model picker, model label, or the full main-composer toolbar to each follow-up. | User, Oct 22: “Get rid of model”; send “on right (not new line)”; keep it tighter. Source: [composer][composer], [reply layout][feed]. Browser history verified 280/380/740px in light/dark. |
| V06 | Send and action buttons have a visible outline and readable icons/text in both themes. Preserve the requested affordance; the project prefers an inset ring to a layout-changing border. | User, Oct 22: button “really needs a border.” Source: [composer][composer], [actions][actions]. |
| V07 | Long titles wrap inside narrow cards instead of overflowing or being reduced to an unreadable single line. Long detail headings, action names, errors, source labels, and nested content do not force page-level horizontal overflow. | User, Oct 22: title overflow. Source: [card styling][card], [reply layout][feed]. Browser history includes 320px checks; full-content matrix still needed. |
| V08 | The main question entry stays at the top; the feed scrolls independently. New root questions appear at the top, grouped by local calendar day. Replies remain with their root and in creation order. | User, Oct 22; Source: [content][content], [panel][panel], [feed][feed], [Inbox layout][content]. |
| V09 | Insertions/reflow feel natural and preserve understandable ordering. Reduced-motion preference suppresses animations/transitions. Exact timing is not a requirement. | User, Oct 22: natural queue animations. Source: [motion CSS][motion-css], [feed motion][feed-motion]. Browser check needed. |
| V10 | Empty state, question count, running/queued/answered status, and action activity remain available without overwhelming the primary question/answer hierarchy. | Source: [content][content], [feed][feed]. These are current affordances, not a mandate to retain exact wording or placement. |

## 2. Card focus, selection, and disclosure interaction

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| I01 | At most one question has its footer visible. The footer groups info (Original question and source) separately from controls (actions and follow-up). Clicking a question's title or ordinary body focuses it; clicking it again hides its footer; focusing another hides the previous footer. Header and body remain visible in every state, and all titles are keyboard operable so failed cards can reveal Retry. Avoid separate redundant Expand/Less/Follow-up buttons. | User, Oct 22; [panel tests][panel-tests], “toggles one full answer and composer…”. |
| I02 | Escape clears question focus and exits its composer without deleting the draft or cancelling background inbox work. | [panel tests][panel-tests]; [feed][feed]. Current blur handling is textarea-specific; rich editors need equivalent handling. |
| I03 | Draft follow-ups survive collapse/reopen and switching between questions. Each draft belongs to its question. UI updates and replacing input primitives must not reset it. | [panel tests][panel-tests]. Current preservation relies on keeping the composer mounted. **Reload/close-pane draft persistence is not established.** |
| I04 | Opening a detail section, closing it, or clicking its ordinary content selects its containing question. Repeating those interactions keeps that question selected; it does not toggle the whole card off. Keyboard disclosure activation follows the same rule. | User, Oct 30; [answer tests][answer-tests]; browser history `.context/inbox-hierarchy/click-debug-browser.mjs`. |
| I05 | Detail sections start closed, open independently, and retain their individual state while card focus switches or collapses. Multiple sections may remain open even though only one question's composer is focused. | [answer tests][answer-tests], [answer UI][answer-ui]; browser history for focus switching. This is not a single-open accordion. |
| I06 | Native drag selection/copy works for answer text, question titles, parent labels, detail headings/content, and original-question summaries/text, including running titles. Selection must not toggle a card or disclosure or navigate to a parent. | User, Oct 22/30; [panel tests][panel-tests], [answer tests][answer-tests], [card styling][card]; browser history covers real pointer dragging and disabled titles. |
| I07 | Links, source controls, Retry/Delete, actions, recording, Debug, and editor interaction retain their own behavior without accidentally toggling card focus. Code blocks can be interacted with without toggling the card. | [card][card], [panel tests][panel-tests], [answer tests][answer-tests]; Debug browser history. **Contenteditable and portaled controls need explicit coverage if introduced.** |
| I08 | Parent navigation focuses and reveals the correct parent in the feed. The selected card's entire footer source row (note name, heading, arrow icon and empty space) opens its original passage without toggling card focus. Captured quote text is not rendered; the saved quote remains available for navigation and agent context. Source-name text can be selected and copied without navigating. Follow-ups inherit source navigation. | User, Nov 11; [card][card], [feed][feed], [source UI tests][source-ui-tests], [source navigation tests][source-navigation-tests]. Parent scroll/focus needs a browser assertion. |
| I09 | Keyboard-operable controls retain accessible names, expanded state, and discoverable focus. Delete remains reachable by keyboard and on devices without hover. | Source: [card][card], [Inbox layout][content], [card styling][card]. Do not carry Reader-specific label-removal decisions into inbox. |

## 3. Composing and configuration

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| C01 | Enter submits; Shift+Enter inserts a newline; Enter during IME composition does not submit prematurely. Empty/whitespace-only input cannot submit. | Source: [composer][composer]. Dedicated keyboard/IME regressions are still needed. |
| C02 | Clicking Send and pressing Enter use the same submission path. A pending submission prevents duplicate sends. The draft clears only after successful submission; failure displays an error and preserves the text for retry. | [panel tests][panel-tests] covers save failure; [composer][composer] implements the other guards. Add delayed-submit/double-input coverage. |
| C03 | The top composer remains usable while other questions run: submitting queues an independent question. A follow-up is attached to the selected question, not whatever chat session happens to be active. | [panel tests][panel-tests], [controller tests][controller-tests]. Do not bind inbox send availability to a chat turn's running state. |
| C04 | Inbox keeps its own provider/model preference and uses the shared catalog. A saved model absent from the catalog still displays its identity rather than being silently replaced. Changing inbox selection must not mutate the active chat or chat defaults. | [panel][panel], [controller][controller]. Unknown-model display and cross-surface isolation need explicit tests after picker extraction. |
| C05 | New questions, follow-ups, and actions snapshot the current inbox model, reasoning, and instructions; retries retain the original attempt's configuration. Pending/existing questions must not be retargeted by a picker change. | [controller tests][controller-tests], [instruction tests][instruction-tests], [reasoning settings tests][reasoning-tests], [action tests][action-tests]. |
| C06 | Preserve all six inbox reasoning options: Off, Minimal, Low, Medium, High, Extra high. Saved/external changes are reflected; failed saves remain visible and retryable. | [reasoning settings tests][reasoning-tests], [reasoning setting][reasoning-setting]. Chat's current toggle offers only five levels. |
| C07 | Answer instructions remain editable replacement text, including an empty value, with Save and Reset. Preserve custom text and failed-save drafts. Do not replace this with a terse/full preset. | User, Oct 22; [instruction setting tests][instruction-setting-tests], [instruction tests][instruction-tests]. |
| C08 | Provider credentials/settings and the native shortcut configuration remain reachable. Model/credential errors are visible and recoverable; no default shortcut overrides the user's bindings. | [settings tests][settings-tests], [host tests][host-tests], [agent tests][agent-tests]. Reusing picker auth shortcuts may improve access but must use the same application auth manager. |
| C09 | Configurable concurrency remains 1–4 independent questions/actions; the default is three. Closing the pane does not stop background work. | User, Oct 22; [content][content], [controller tests][controller-tests], [action tests][action-tests], [guide][guide]. |

## 4. Answer presentation and source fidelity

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| A01 | New answers expose the shortest useful direct response, including a one-word answer when sufficient. Essential correctness qualifications/uncertainty stay visible; mechanisms, examples, and supporting explanation go in optional collapsed sections. Structured short answers are not line-clamped merely because the card is unfocused. | User, Oct 30; [answer instructions][answer-instructions], [answer UI][answer-ui], [agent tests][agent-tests]. Semantic answer quality needs representative examples in addition to schema tests. |
| A02 | Detail headings identify their content, and detail bodies retain Markdown, links, math, and code rendering. No empty disclosure appears when details are absent or empty. | [answer tests][answer-tests], [panel][panel]. Add browser fixtures for rich content and narrow widths. |
| A03 | Legacy saved answers keep their content and rendering, including preview/full expansion behavior; migration must not truncate, rewrite, or fabricate structured sections. | [answer tests][answer-tests], [panel tests][panel-tests], [persistence tests][persistence-tests]. |
| A04 | Display titles minimally turn the submitted wording into a useful question header, retaining technical terms and all topics. Original submitted wording stays recoverable under Original question in the selected card's footer. Old questions without generated titles remain supported and have checklist markers cleaned for display. | User, Oct 22; [panel tests][panel-tests], [agent tests][agent-tests], [answer instructions][answer-instructions]. Titles are plain text; stored single-line validation does not prohibit visual wrapping. |
| A05 | Follow-ups, actions, and flashcard recordings receive the **entire** answer, including every unopened detail, with only the chosen ancestor chain and its source. Disclosure visibility never controls the context sent to an agent. | [answer tests][answer-tests], [controller tests][controller-tests], [action-agent tests][action-agent-tests], [capture tests][capture-tests]. |
| A06 | Typed/pasted questions capture the most recently active Markdown note even when inbox has focus, using unsaved editor content. A pasted task retains heading and parent-list context; standalone questions still work with no note. | User, Oct 22: decontextualized nested task failed. [host tests][host-tests], [agent tests][agent-tests]. Sharing an editor must not replace this with chat viewing-context or mention behavior. |
| A07 | The selection command submits the whole current row for a cursor or selection of at most three non-whitespace characters; larger selections submit selected text. Blank rows are ignored. The exact source quote is preserved separately from cleaned question text. | User, Oct 30; [host tests][host-tests], [capture source][capture-source]. |
| A08 | Open source always opens an existing source file. It locates the exact quote, otherwise a unique line starting with the quote's first nonblank line ignoring whitespace, otherwise the line with the longest common subsequence of the quote ignoring whitespace. Duplicate exact matches and equal subsequence scores prefer the saved line. Exact selections retain their range; fallback matches select the whole line. Empty quotes or no shared characters leave the file open without a selection. Missing files are reported, and the captured quote is preserved. Follow-ups retain source lineage. | User, Nov 8; [source navigation tests][source-navigation-tests], [host tests][host-tests], [controller tests][controller-tests]. |

## 5. Actions, diagnostics, recording, and recovery

These are adjacent behavior contracts that replacing controls must not disturb; this refactor is not a redesign of their backend logic.

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| L01 | Selected answered cards expose configured actions in the footer; unselected cards hide all footer controls. Each action/question pair has at most one outstanding run. Queued/running/finishing/failed status is visible; failure offers Retry/Dismiss; successful cleanup makes rerun possible without deleting the question or definition. | [action UI tests][action-ui-tests], [action tests][action-tests], [actions][actions]. |
| L02 | Action definitions retain editable names/prompts and stable IDs; failed edits preserve the draft. Existing outstanding runs remain understandable if their definition changes or is removed. | [action setting tests][action-setting-tests], [action tests][action-tests], [actions][actions]. |
| L03 | Record/Stop and switching to another answer complete recording automatically. The flow does not add a second card editor, agent action, or confirmation/review step. Nonempty recordings save; empty recordings report that outcome without an empty episode. | [capture UI tests][capture-ui-tests], [capture lifecycle tests][capture-lifecycle-tests], [capture handoff][capture-handoff]. |
| L04 | Recording status and recovery remain accessible after its question is deleted. A failed read/save stays incomplete, can retry, and cannot be overwritten by a new recording. Completion notifications happen after durable success. | [capture UI tests][capture-ui-tests], [capture lifecycle tests][capture-lifecycle-tests], [capture persistence tests][capture-persistence-tests]. |
| L05 | Each selected question has a one-click paste-ready Debug export in its footer for its current attempt and branch, with answer/error/context and available events. Copy progress/success is visible; clipboard failure is reported and retryable. Clicking it does not focus/collapse the card. | User, Oct 30; [debug tests][debug-tests], [debug button][debug-button], browser history. |
| L06 | Debug export redacts credentials and explicitly marks missing/truncated historical events. Do not invent a complete transcript for older questions or include hidden reasoning/binary payloads. Diagnostic fields remain separate from pinned training research. | [debug tests][debug-tests], [evidence tests][evidence-tests], [capture tests][capture-tests]. |
| L07 | Storage errors remain visible and expose Retry save; no input is silently discarded. Restart resumes queued work, marks interrupted work retryable, and restores completed answers/preferences. Malformed storage is preserved. | [panel tests][panel-tests], [controller tests][controller-tests], [persistence tests][persistence-tests]. |
| L08 | Delete removes the selected question and descendants and cancels their work. Late/stale results cannot resurrect deleted questions. One question's failure does not block unrelated valid work. | [controller tests][controller-tests], [agent tests][agent-tests]. |

## 6. Shared chat behavior must also survive

Do not replace inbox semantics with chat semantics, or simplify chat to match inbox. Keep these boundaries when extracting components:

| ID | Requirement / acceptance scenario | Evidence and existing coverage |
| --- | --- | --- |
| S01 | Chat model changes still update its active runtime and chat defaults; chat reasoning changes still update its runtime. Inbox changes remain independent (C04–C06). | [model hook tests][model-hook-tests], [thinking hook tests][thinking-hook-tests]. |
| S02 | Chat retains its send/cancel state through session switching; inbox submit only queues work and preserves failed-submit text. The shared visual editor must support both lifecycles. | [prompt tests][prompt-tests], [chat prompt][chat-prompt], [composer][composer]. |
| S03 | Chat retains mention insertion, suggestion keyboard navigation/dismissal, and document-to-text round trips. Inbox can use the editor with mentions disabled; typing `@` must then remain ordinary text. | [editor tests][editor-tests]. The inbox-disabled path is a new regression target, not a feature already implemented. |
| S04 | Shared controls keep host theme integration, keyboard usability, authentication actions, and layout stability as selected models/reasoning labels change. | [shared UI README][shared-readme], [picker auth tests][picker-auth-tests], [thinking UI tests][thinking-ui-tests]. Browser verification needed in actual Obsidian styling. |

## Superseded expectations and known evidence gaps

1. **Disclosure must not focus the card** is obsolete. `.context/inbox-details/browser-check.mjs` contains that earlier expectation. The later user request, current `answers.test.tsx`, and `.context/inbox-hierarchy/click-debug-browser.mjs` establish I04. Do not revive the old check unchanged.
2. **Every answer is a truncated preview until focus** is obsolete for structured answers. A01 keeps the full short answer visible; A03 preserves legacy preview behavior.
3. **Follow-up includes a model label or a full chat toolbar** conflicts with the explicit compact-footer request. Model selection remains available at inbox level.
4. **Flashcard capture requires review/confirmation** is superseded by automatic Stop/switch completion. Historical planning notes predate L03.
5. The guide still contains older `return_answer({ title, answer })` and fixed two-minute deadline descriptions. Current structured answer code and the runtime's download-aware deadline test are authoritative. These stale descriptions were not changed in this discovery pass.
6. Existing component tests do not prove pixel geometry, theme contrast, actual drag selection, IME behavior, scroll behavior, or portal event handling. Historical browser artifacts are supporting evidence only.
7. Persistent follow-up drafts across pane close/reload, inbox mentions, a rich editor, and new per-question model overrides are **not** established requirements. Do not present them as already supported. The requested scope is sharing UI while preserving resolved behavior.

The 2026-11-11 footer revision supersedes earlier expectations that actions and source rows remain visible on unselected cards, that running titles are disabled, and that Captured quote has its own disclosure. The saved source data is unchanged.

## Regression cases to add before component replacement

- **Editor lifecycle:** C01/C02/I02/I03 with Enter, Shift+Enter, IME, delayed submit, repeated click/Enter, save failure, focus switching, and Escape. Preserve the draft and do not cancel unrelated queued work.
- **Rich editor events, if used:** clicking/selecting inside `contenteditable` must not reach card-toggle behavior. Current `card.tsx` exempts textarea/input but not contenteditable. Cover paste/newlines and text round trips. Do not assume chat's current key handler already satisfies inbox's IME guard.
- **Picker isolation:** C04–C06 with chat and inbox mounted together, unknown saved model, Minimal reasoning, configuration save failure, and an open portaled popover. Check Escape handling and focus restoration without accidental card collapse.
- **Visual fixture:** two independent roots, a child and grandchild, one legacy answer, structured details, long titles/actions/errors, all request states, recording, and Debug. Check 280/320/380/740px in both light and dark themes. Assert V02's relative spacing and V05's same-row/right-hand send geometry rather than old pixel constants.
- **Pointer/keyboard fixture:** native text dragging on titles and summaries (including disabled titles), independent details, links/code, parent/source navigation, action/Debug clicks, and drafts surviving switches. Use the latest I04 behavior.
- **Motion/scroll fixture:** reduced motion, inserting a new root, receiving an answer while reading, and adding a follow-up. Check ordering, reachability, and independently scrolling feed; do not automatically adopt chat's bottom-follow behavior.

Run the existing inbox/settings suites before and after the refactor, plus affected shared picker/editor/hooks suites. Build, lint, and format are required. Browser checks must run against the actual refactored components with Obsidian host CSS; a mocked preview is not proof that the installed plugin works. Record source validation, bundle generation, and installed-plugin reload separately.

## Baseline verification on 2026-11-03

- **230 tests passed across 34 files:** inbox, settings, shared conversation input/picker authentication, and React prompt/model/reasoning hooks. Command:

  ```sh
  NODE_OPTIONS=--experimental-sqlite npx vitest run apps/obsidian/src/apps/inbox apps/obsidian/src/plugin/settings apps/shared/ui/__tests__/conversation/input apps/shared/ui/__tests__/conversation/model-selector-auth-action.test.tsx packages/ui/react/src/__tests__/prompt.test.tsx packages/ui/react/src/__tests__/use-model-selection.test.tsx packages/ui/react/src/__tests__/use-thinking-level.test.tsx
  ```

- `npm run build` and `npm run lint -- --ignore-pattern '.context/**'` passed.
- This document passes Prettier with the normal docs ignore overridden; all local reference links resolve and all 48 requirement IDs are unique.
- Logs are in `.context/inbox-regressions/`. No browser checks, plugin installation/reload, or new regression tests were performed in this documentation pass. Passing the existing suite does not close the coverage gaps above.

## Refactor verification on 2026-11-03

The baseline above was committed as `dcf2de70f` before implementation. The refactor extracts controlled `ModelPicker` and `ThinkingControl` components from their chat bindings, shares `PromptSurface` and `PromptSubmitButton`, and uses the existing `AutoGrowTextarea` for inbox. Inbox retains its own submission lifecycle, all six reasoning levels, and compact follow-ups. No rich editor or mention behavior is required by this implementation.

New executable guards:

- [Composer regressions](../apps/obsidian/src/apps/inbox/__tests__/composer.test.tsx): C01/C02/V05 keyboard and IME behavior, failed-submit text retention/retry, pending-submit protection, blank text, and simple follow-up controls. The repeated-submit test initially exposed a real race; a synchronous pending guard now prevents it.
- [Controlled model picker](../apps/shared/ui/__tests__/conversation/input/model-picker.test.tsx): C04 unknown saved models, external selection updates, searchable choices, and owner callbacks without an active agent.
- [Controlled thinking level](../apps/shared/ui/__tests__/conversation/input/thinking-control.test.tsx): C06 Minimal and the caller-supplied level cycle.

Browser checks use the actual `InboxPanel`/controller, shared chat pickers, generated plugin CSS, and `app.css` extracted from the installed Obsidian application. They passed in light/dark themes at 280/320/380/740px and cover V01–V07's layout cases; I01–I07's focus, native title/summary drag selection, independent details, drafts and Escape cases; picker Escape; L05 Debug copying; and C01/C02/C04/C06/S01 submission/configuration cases. Expanded code initially widened a grid track at 280px; a bounded track now keeps code scrolling within the detail. Historical test gaps outside these scenarios remain relevant.

The broader inbox/settings/shared UI/React hook suite passed **581 tests across 86 files**, with one pre-existing skipped file containing two TODO tests. Source build, lint, formatting and the production bundle passed. Browser script, results and screenshots are under `.context/inbox-refactor/`; these local artifacts support this verification but are not a portable CI browser suite. The plugin was bundled, not installed or reloaded.

## Design-system styling verification on 2026-11-11

Checkpoint: `4acd6022`, committed before this refactor. Inbox layout, cards, source rows, replies and empty states now use Tailwind utilities and Franklin's existing theme bridge. Controls use the shared Button, IconButton, Badge, StatusDot and controlled Select, alongside the existing prompt/model/reasoning components. Shared outline buttons use inset rings instead of borders; no new public API or dependency was added.

Native question-title/parent controls retain selectable text, including disabled titles. Native detail disclosures stay mounted and independent, as do follow-up drafts. `.study-feed` and `.study-answer-details` remain behavioral hooks; a surviving `study-*` class does not imply a custom style rule. The detail grid retains a bounded track through `grid-cols-1` (`minmax(0, 1fr)`). Feed reflow still uses the existing motion hook; insertion/reveal/spinner/recording animations use the existing utility bundle.

Error and recording text use Obsidian's existing `--text-error`. The host bridge's `--destructive` represents a background fill, so it is not substituted for a text color. The bridge and shadcn semantic tokens are unchanged.

Measured scope: Inbox UI and recording/capture stylesheets, excluding action settings. The checkpoint used `src/inbox/`; the current tree uses `src/apps/inbox/` after a concurrent source reorganization.

| Metric | Checkpoint | Refactored |
| --- | --: | --: |
| Handwritten CSS lines (including comments and blank lines) | 746 | 23 |
| CSS declarations | 411 | 6 |
| `!important` declarations | 12 | 3 |
| Production plugin stylesheet bytes | 114,064 | 103,984 |

The 23 remaining lines handle Obsidian's view-container padding/overflow, scoped box sizing because the host omits Tailwind preflight, and reduced-motion suppression across nested shared controls. The three remaining `!important` declarations implement that reduced-motion preference. No styling was relocated into a new stylesheet or theme.

Validation:

- Baseline: **230 tests across 37 files**, plus the existing browser matrix, passed before implementation.
- Refactored before the source reorganization: **608 tests across 88 files** passed. The final run against the moved Inbox/settings, shared UI and React hooks passed **606 tests across 87 files**; one pre-existing skipped file and two TODO tests remain. The final run used `--maxWorkers=3 --testTimeout=30000` after concurrent repository checks caused default-timeout failures; no tests were changed.
- `npm run build`, formatting checks, production bundling, and lint passed. Full lint passed before the reorganization, and affected-file lint passed afterward. Full lint excludes existing `.context` scratch artifacts and required `NODE_OPTIONS=--max-old-space-size=8192` after the default heap was exhausted.
- Browser checks used the actual InboxPanel/controller, shared chat controls, generated plugin CSS, and the previously extracted Obsidian host stylesheet. Both themes passed at 280/320/380/740px for card/form overflow, bounded code, long action names/errors, card outlines, tighter reply spacing, and inline follow-up/send geometry.
- Interaction checks cover native title/summary selection, disabled-title dragging, independent details, retained drafts, Escape, keyboard submission and failed-save retention, picker independence, concurrency persistence/focus restoration, source-row/quote independence, Debug, recording switch/recovery after deletion, keyboard/touch Delete visibility, legacy preview clamping, request states, root insertion scrolling, and motion preferences.

The self-initiated code-clean review found no remaining issues; its scoped review patch and report are saved with the validation artifacts.

Browser fixtures, scripts, results and screenshots are under `.context/inbox-css-refactor/`; validation logs use `.context/inbox-css-*.log`. The bundle-size result includes the concurrent normalization of Inbox typography onto standard text utilities. These local checks do not constitute a portable CI browser suite. The production bundle was generated; the plugin was not installed or reloaded. Validation was repeated after the concurrent source reorganization, preserving its moved files and this styling refactor.

## Card sections verification on 2026-11-11

Checkpoint `cc96d8b02` preserves the preceding card appearance. `QuestionCard` now composes `QuestionHeader`, `QuestionBody` and `QuestionFooter`; the footer accepts separate info and controls slots. It contains Original question, source navigation, actions and the follow-up field. Only the selected footer is visible, but it remains mounted to preserve drafts and disclosure state. Captured quote rendering is removed; source data and agent context are unchanged. All titles remain keyboard operable so failed questions can reveal Retry.

- **283 tests across 44 files passed**, including four new [card section regressions](../apps/obsidian/src/apps/inbox/ui/__tests__/card.test.tsx) and updated source, action, recording and panel coverage.
- Workspace build, lint (excluding existing `.context` artifacts), formatting, production bundling and the scoped self-initiated code-clean review passed. No package API or dependency changed.
- Browser checks used the actual InboxPanel/controller, generated plugin CSS and the extracted Obsidian host stylesheet. Light/dark themes at 280/320/380/740px passed footer visibility, wrapping, bounded code/errors and compact follow-up geometry checks. Interaction checks cover drafts/disclosures across focus changes and Escape, source-name drag selection, source navigation, Debug, keyboard access to Retry, inherited sources, recording switches and stopping after question deletion.

Local browser artifacts are under `.context/inbox-card-sections/`. The production bundle was generated; the plugin was not installed or reloaded.

## Groups and children contract

- Groups have optional titles and a native fold header. Untitled groups use “Group” as the fold label. Direct group children have no added indentation; children of questions keep shallow indentation. Siblings remain closer than independent trees.
- Folding hides the whole subtree while leaving question components mounted, drafts and disclosures retained, and queued/running work alive. Fold state persists. Nested group folds remain independent.
- Navigation from an inline source pill reveals every folded ancestor before selecting, scrolling and focusing the requested question; repeated navigation still works.
- Thought dumps produce sibling questions under one group. Dismissing extraction status retains the original text as group context. Context follows the ancestor branch and excludes sibling answers.
- Relationships are created through controller operations. Automatic ancestor-body collapse and hover navigation remain deferred.

Coverage: [hierarchy/controller tests](../apps/obsidian/src/apps/inbox/hierarchy/__tests__/controller.test.ts), [group disclosure tests](../apps/obsidian/src/apps/inbox/ui/__tests__/groups.test.tsx), [group capture test](../apps/obsidian/src/apps/inbox/hierarchy/__tests__/capture.test.ts), and thought-dump queue tests. Browser geometry and theme checks are recorded under `.context/inbox-groups/`.

## Historical request trail

- **2026-10-22, initial inbox iteration** (`01a16322-3534-7ff3-b51e-e77a2f9aecaa`): fast background answers, day grouping/top insertion, concurrent independent agents, status/retry, neutral input styling, selectable output, one focused card, simple follow-ups, source context, readable question headers and no title overflow. Original user messages were inspected for this compilation.
- **2026-10-22, footer refinement** (`01a16494-56f2-71d3-a8d7-e17fe11b19b8`): remove model metadata, inline right-hand send, visible outline, reuse components. Original user messages and the saved rollout summary were inspected.
- **2026-10-30, hierarchy and interactions** (`01a18cc5-ed2a-7911-9078-0e8174b044a0`): accepted stronger card boundaries, tightened parent/reply grouping, disclosure selects its parent, selectable headings/titles, copyable agent diagnostics. Original user messages, current tests/source, and saved browser script were inspected.
- **2026-11-03, this discussion**: reduce duplication through shared UI without requiring identical capabilities; preserve all resolved goals/tweaks even if the appearance changes.

[guide]: inbox-prototype.md
[capture-handoff]: flashcard-training-capture-handoff.md
[panel]: ../apps/obsidian/src/apps/inbox/ui/panel.tsx
[content]: ../apps/obsidian/src/apps/inbox/ui/content.tsx
[card]: ../apps/obsidian/src/apps/inbox/ui/card.tsx
[feed]: ../apps/obsidian/src/apps/inbox/ui/feed.tsx
[composer]: ../apps/obsidian/src/apps/inbox/ui/composer.tsx
[actions]: ../apps/obsidian/src/apps/inbox/ui/actions.tsx
[answer-ui]: ../apps/obsidian/src/apps/inbox/ui/answer.tsx
[feed-motion]: ../apps/obsidian/src/apps/inbox/ui/use-feed-motion.ts
[controller]: ../apps/obsidian/src/apps/inbox/controller/controller.ts
[capture-source]: ../apps/obsidian/src/apps/inbox/host/capture.ts
[answer-instructions]: ../apps/obsidian/src/apps/inbox/answer-instructions.ts
[reasoning-setting]: ../apps/obsidian/src/apps/inbox/settings/reasoning.tsx
[debug-button]: ../apps/obsidian/src/apps/inbox/debug/button.tsx
[panel-tests]: ../apps/obsidian/src/apps/inbox/__tests__/panel.test.tsx
[answer-tests]: ../apps/obsidian/src/apps/inbox/__tests__/answers.test.tsx
[host-tests]: ../apps/obsidian/src/apps/inbox/__tests__/host.test.ts
[source-ui-tests]: ../apps/obsidian/src/apps/inbox/ui/__tests__/source.test.tsx
[source-navigation-tests]: ../apps/obsidian/src/apps/inbox/host/__tests__/open-source.test.ts
[controller-tests]: ../apps/obsidian/src/apps/inbox/__tests__/controller.test.ts
[instruction-tests]: ../apps/obsidian/src/apps/inbox/__tests__/instructions.test.ts
[agent-tests]: ../apps/obsidian/src/apps/inbox/__tests__/agent.test.ts
[persistence-tests]: ../apps/obsidian/src/apps/inbox/__tests__/persistence.test.ts
[action-tests]: ../apps/obsidian/src/apps/inbox/__tests__/actions.test.ts
[action-agent-tests]: ../apps/obsidian/src/apps/inbox/__tests__/action-agent.test.ts
[action-ui-tests]: ../apps/obsidian/src/apps/inbox/__tests__/action-panel.test.tsx
[debug-tests]: ../apps/obsidian/src/apps/inbox/__tests__/debug.test.tsx
[capture-tests]: ../apps/obsidian/src/apps/inbox/capture/__tests__/controller.test.ts
[capture-ui-tests]: ../apps/obsidian/src/apps/inbox/capture/__tests__/panel.test.tsx
[capture-lifecycle-tests]: ../apps/obsidian/src/apps/inbox/capture/__tests__/lifecycle.test.ts
[capture-persistence-tests]: ../apps/obsidian/src/apps/inbox/capture/__tests__/persistence.test.ts
[evidence-tests]: ../apps/obsidian/src/apps/inbox/evidence/__tests__/runtime.test.ts
[settings-tests]: ../apps/obsidian/src/plugin/settings/__tests__/
[reasoning-tests]: ../apps/obsidian/src/apps/inbox/settings/__tests__/reasoning.test.tsx
[instruction-setting-tests]: ../apps/obsidian/src/apps/inbox/settings/__tests__/instructions.test.tsx
[action-setting-tests]: ../apps/obsidian/src/apps/inbox/settings/actions/__tests__/settings.test.tsx
[model-hook-tests]: ../packages/ui/react/src/__tests__/use-model-selection.test.tsx
[thinking-hook-tests]: ../packages/ui/react/src/__tests__/use-thinking-level.test.tsx
[prompt-tests]: ../packages/ui/react/src/__tests__/prompt.test.tsx
[chat-prompt]: ../packages/ui/react/src/prompt/prompt.tsx
[editor-tests]: ../apps/shared/ui/__tests__/conversation/input/editor-prompt/
[picker-auth-tests]: ../apps/shared/ui/__tests__/conversation/model-selector-auth-action.test.tsx
[thinking-ui-tests]: ../apps/shared/ui/__tests__/conversation/input/thinking-toggle.test.tsx
[shared-readme]: ../apps/shared/ui/README.md
