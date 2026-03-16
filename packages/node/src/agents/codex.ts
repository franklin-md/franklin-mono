import type { AgentSpec } from '@franklin/agent';

// ---------------------------------------------------------------------------
// Codex sandboxing notes (investigated 2025-03-15)
// ---------------------------------------------------------------------------
//
// Codex sandboxing is controlled via -c config overrides passed to codex-acp.
// The flags below configure the agent process itself — this is the primary
// control surface. Codex does NOT use client-side ACP methods (readTextFile,
// writeTextFile, createTerminal) regardless of advertised ClientCapabilities.
//
// What we can sandbox:
//
//   Filesystem writes — sandbox_mode="read-only" blocks all writes. When the
//     agent tries to write (either via direct edit or shell command), it sends
//     a requestPermission event with kind="edit" or kind="execute". This is
//     the main enforcement point we have.
//
//   Filesystem reads — the read-only sandbox allows all reads, including
//     outside the cwd. No requestPermission event is raised for reads.
//     To restrict reads, a higher sandbox mode or Franklin-layer middleware
//     would be needed.
//
//   Shell commands — approval_policy="on-request" forces the agent to send
//     requestPermission with kind="execute" before running commands.
//     The permission includes the full command, cwd, and args.
//
//   Web search — web_search="disabled" removes the search tool entirely.
//     The agent simply doesn't have the capability; no permission event is
//     raised. It will tell the user it can't search.
//
//   Network — network is off by default in the Codex sandbox (seatbelt on
//     macOS, landlock+seccomp on Linux). Can be enabled via
//     sandbox_workspace_write.network_access=true but we leave it off.
//
// See: https://developers.openai.com/codex/agent-approvals-security
// ---------------------------------------------------------------------------

const CODEX_SANDBOX_FLAGS = [
	'-c',
	'sandbox_mode="read-only"',
	'-c',
	'approval_policy="on-request"',
	'-c',
	'web_search="disabled"',
];

export const codexAgentSpec = {
	command: 'npx',
	args: ['@zed-industries/codex-acp', ...CODEX_SANDBOX_FLAGS],
} satisfies AgentSpec;
