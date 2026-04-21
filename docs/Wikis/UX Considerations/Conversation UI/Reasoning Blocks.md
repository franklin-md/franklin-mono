
## Dimensions of the design space

Harnesses differ on three largely independent axes.

### Text rendering
- **Plain text**: rendered verbatim, often italicized, line breaks preserved but no markdown parsing.
- **Markdown**: rendered through the same markdown pipeline as assistant output (headers, code fences, lists, inline code).
- **Hidden summary only**: body is never shown; replaced by a compact placeholder line.

### Collapse policy
- **Always expanded**: stays open for the lifetime of the turn. Low friction, high noise after several turns.
- **Preference-based default**: user-controlled global toggle or "collapse by default" setting. Static; not event-driven.
- **Auto-collapse on completion**: expanded while streaming, collapsed once the reasoning phase ends.
- **Always hidden**: only a summary line is ever visible; body not reachable from the UI.

### Header and progress state
- **Static label** (e.g. `Thinking`).
- **Streaming → completed label transition** (e.g. `Thinking...` → `Thought for 8s`).
- **Streaming extras**: elapsed seconds, topic heading extracted from reasoning, shimmer animation.
- **Metadata on completion**: elapsed time, token count.

## Observed patterns across harnesses

| Harness       | Surface   | Fidelity       | Collapse policy                               | Header state                                       |
| ------------- | --------- | -------------- | --------------------------------------------- | -------------------------------------------------- |
| **Cline**     | webview   | Plain text     | Auto-collapse on completion                   | `Thinking...` (streaming) → `Thinking` (collapsed) |
| **Cline**     | CLI       | Hidden summary | Always hidden                                 | —                                                  |
| **Roo Code**  | webview   | Markdown       | Preference-based default (defaults collapsed) | `Thinking` + elapsed seconds while streaming       |
| **Roo Code**  | CLI       | Plain text     | Always expanded                               | `Roo is thinking:`                                 |
| **Continue**  | webview   | Markdown       | Collapsed by default                          | `Thinking...` → `Thought for Xs` + token count     |
| **OpenCode**  | app + TUI | Markdown       | Global visibility toggle                      | Shimmered `Thinking` + optional topic heading      |
| **Claw Code** | TUI       | Hidden summary | Always hidden                                 | `▶ Thinking (N chars hidden)`                      |

## Failure modes

- **Markdown source rendered as plain text**: reasoning typically *contains* markdown (headers, lists, fenced code). Rendering it verbatim shows `###` and `**bold**` glyphs without the semantic benefit.
- **Always-expanded completed reasoning**: each past turn keeps several screens of reasoning text scrollable, drowning out the assistant's answers when scrolling back.
