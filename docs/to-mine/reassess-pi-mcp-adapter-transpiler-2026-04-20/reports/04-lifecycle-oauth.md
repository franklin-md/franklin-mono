# Lifecycle & OAuth Transpilability Assessment: pi-mcp-adapter

## 1. Lifecycle Shape

**Concrete pattern:**
- `session_start` (index.ts:86) fires async, returns Promise. Multiple calls per process lifetime are expected; each fires independently **without awaiting** the handler's completion promise.
- `session_shutdown` (index.ts:137) fires async, awaits the handler, guarantees cleanup before next session.
- Lifecycle uses a `lifecycleGeneration` counter (line 16) to detect and reject stale init chains and race conditions.

**Race defense:**
- Line 101–103: After prev shutdown completes, checks `if (generation !== lifecycleGeneration)` to abort if another `session_start` fired during cleanup.
- Line 112–120: In the async `initializeMcp()` completion handler, re-checks generation and promise identity before committing state, handling the case where init took seconds and a new session began.
- This is a **classic idempotent generation-token pattern** defending against session-restart storms.

**State transitions:**
- One session ≠ one process lifetime. A single process can have multiple sessions back-to-back (restart via `session_start`).
- `state` and `initPromise` are cleared on restart (lines 89–90, 141), preventing leakage into the next session's init.

---

## 2. State Scoping: Process vs Session

| Artifact | Scope | Details |
|----------|-------|---------|
| **OAuth tokens & credentials** | Process-wide persistent | Stored in `~/.pi/agent/mcp-oauth/<server>/tokens.json` (mcp-auth.ts:44). Survives session shutdown. Reused across sessions. |
| **OAuth callback HTTP server** | Process-wide | Single server instance (mcp-callback-server.ts:66). Started by `initializeOAuth()` (line 391). Survives session boundary. Reused for all sessions' auth flows within the process. |
| **Callback pending-auth state** | Process-wide | `pendingAuths` Map (mcp-callback-server.ts:67). Tracks in-flight OAuth code exchanges. If callback arrives during session shutdown, it still completes. |
| **MCP server connections** | Session-scoped | Managed by `McpServerManager` (server-manager.ts:33–34). Closed on `session_shutdown` → `gracefulShutdown()` (lifecycle.ts:87–92). New session gets fresh connections. |
| **Tool metadata cache** | Session-scoped disk + memory | In-memory `toolMetadata` Map (init.ts:37) is part of `state`, flushed to disk at shutdown (init.ts:251–256). Cache file survives; memory Map doesn't. |
| **Health-check interval** | Session-scoped | Cleared on shutdown (lifecycle.ts:88–89). Restarted on next session init. |
| **Metadata generation pending promises** | Session-scoped | `initPromise` cleared on restart (index.ts:90, 141). |

**Critical insight:** The **OAuth callback server spans session boundaries** — a process-level resource not tied to a single session's lifecycle.

---

## 3. Franklin's Current Session Model vs Adapter Needs

**Franklin has:**
- `SessionCollection` and `createSessionSystem()` (systems/sessions/system.ts) for managing child/fork/removeSelf operations **within a session's runtime closure**.
- Session persistence via `PersistedSessionCollection` (agent/src/session/persisted-session-collection.ts).
- No `session_start` or `session_shutdown` hooks in the extension API.

**Franklin is missing:**
1. **Fire-and-forget async entry hook** (`session_start`-like): A callback that fires when a session begins, runs async to completion **without blocking**, allows extension to initialize long-lived state.
2. **Session shutdown hook** (`session_shutdown`-like): A callback invoked when a session is torn down, allowing graceful cleanup.
3. **Process-lifetime extension state**: Franklin's extension API has no documented way to hold state across session boundaries (e.g., a persistent HTTP server).
4. **Idempotent generation/deduplication tokens**: No built-in mechanism for extensions to coordinate concurrent session-start calls with a generation counter.

**Gap assessment: MODERATE-TO-HIGH**
- Extensions are compiled-time declarative (algebra/system); no runtime hooks for session events.
- Sessions are runtime-only features (systems/sessions/runtime/). No clear way to hook "before session starts" or "after session ends" at the extension level.

---

## 4. OAuth Callback Server: Side-Effect Compatibility

**What the adapter does (mcp-callback-server.ts:151–189):**
1. Spins up a local HTTP server on port 8080 (or scans forward) at process init.
2. Server listens on `127.0.0.1:8080/mcp-oauth/callback` for OAuth redirect URIs.
3. On callback arrival, resolves pending auth promise with the authorization code.
4. Server survives session boundaries; `stopCallbackServer()` only called on process shutdown.

**Franklin extension invariants:**
- Extensions are pure, compile-time declarations (no direct I/O).
- Runtime system closures can perform side-effects, but are expected to be ephemeral per session.
- No documented mechanism for an extension to own a long-lived OS resource (port, socket) that persists across session restarts.

**Verdict: INCOMPATIBLE TODAY**
- The callback server is a **process-level side-effect** (port binding, async listener loop).
- If Franklin tries to hot-reload or restart the extension without process restart, the server and port binding may conflict or orphan.
- Franklin would need explicit primitives: `@extensionStartup() async fn` (process lifetime) vs `@sessionStart() async fn` (session lifetime).

---

## 5. `pi.sendMessage({ triggerTurn: true })` Pattern

**Adapter usage (CHANGELOG, ui-session.ts):**
```typescript
if (state.sendMessage) {
  state.sendMessage({ triggerTurn: true });
}
```
Injects a synthetic turn trigger, causing the agent to loop and process pending prompts/intents without explicit user input.

**Franklin equivalent:**
- No equivalent found in Franklin's agent or extension APIs.
- Sessions are passive (no internal injection of user-like messages).
- `pi.sendMessage` (from pi-coding-agent) is a Pi extension API, not Franklin's.

**Gap: YES, MISSING**
- Franklin would need `ctx.runtime.sendUserMessage()` or similar to let an extension inject a prompt and trigger a turn.
- This is an **active injection** capability, not a passive query.
- Moderate effort to add; requires protocol change.

---

## 6. Summary: Lifecycle & Side-Effect Transpilability Gap Score

| Dimension | Status | Gap | Notes |
|-----------|--------|-----|-------|
| **Session-start hook** | Missing | HIGH | No Pi-like `session_start` callback. Would require new extension hook. |
| **Session-shutdown hook** | Missing | HIGH | No counterpart for graceful cleanup. |
| **Process-lifetime state** | Not supported | HIGH | No mechanism for extension to own a port/server across sessions. |
| **Generation/idempotency tokens** | Not in use | LOW | Franklin doesn't expose concurrent session-start, so less critical; but generation pattern is sound. |
| **OAuth callback server** | Incompatible | HIGH | Port binding, process-level resource. Needs process-startup / process-shutdown hooks in extension system. |
| **`sendMessage` injection** | Missing | MODERATE | Pi has it; Franklin doesn't. Moderate lift to add. |
| **Tool metadata persistence** | Compatible | LOW | Franklin has file I/O and persisted state (Store system). |
| **MCP server lifecycle** | Compatible | LOW | Per-session connection management fits Franklin's session scope. |

### Final Score: **35/100 Transpilable as-is. ~65–70% new primitives required.**

**Blocker:** The OAuth callback server is a **process-scoped HTTP side-effect** that directly conflicts with Franklin's session-centric, compile-time-pure extension model. Transpiling the adapter would require:

1. **Process-lifetime extension lifecycle hooks** (`@extensionInit`, `@extensionShutdown`).
2. **Session boundary callbacks** (`@sessionStart`, `@sessionShutdown`) accessible from the runtime.
3. **Active message injection** (`ctx.runtime.injectUserMessage()`).
4. **Deferred / fire-and-forget async entry points** (not blocking session start).

The adapter's internal session/server management and OAuth flow logic are **technically sound and portable**, but the **process-boundary assumptions** are incompatible with Franklin's current architecture.

