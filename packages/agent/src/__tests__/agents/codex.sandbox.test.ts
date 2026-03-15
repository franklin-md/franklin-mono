import { describe, expect, it } from 'vitest';

import { codexAgentSpec } from '../../agents/index.js';

import { isCodexAvailable, runSandboxTest } from './sandbox-harness.js';

// Sandbox tests verify that Codex respects sandbox restrictions by observing
// the ACP events it sends. The agent spec configures:
//   sandbox_mode="read-only", approval_policy="on-request", web_search="disabled"
//
// Findings from investigation:
//   - web_search="disabled" removes the tool entirely — no permission event,
//     Codex just explains it can't search.
//   - read-only sandbox allows reads everywhere — no permission event for reads.
//   - Writes trigger requestPermission with kind="edit", diff content, and location.

const TIMEOUT = 60_000;
const available = isCodexAvailable();
const describeCodex = available ? describe : describe.skip;

describeCodex('codex sandbox', () => {
	// ------------------------------------------------------------------
	// Web search — tool is removed entirely when web_search="disabled"
	// ------------------------------------------------------------------
	it(
		'web search is unavailable — no permission event, no fetch',
		async () => {
			const { permissions } = await runSandboxTest({
				spec: codexAgentSpec,
				prompt:
					'Search the web for "vitest testing framework" and tell me what you find.',
			});

			// With web_search="disabled", Codex does not have a search tool.
			// It should complete without raising any fetch permission.
			const fetchPermissions = permissions.filter(
				(p) => p.toolCall.kind === 'fetch',
			);
			expect(fetchPermissions).toHaveLength(0);
		},
		TIMEOUT,
	);

	// ------------------------------------------------------------------
	// File read outside cwd — read-only sandbox allows reads everywhere
	// ------------------------------------------------------------------
	it(
		'reading a file outside cwd does not trigger a permission request',
		async () => {
			const { permissions } = await runSandboxTest({
				spec: codexAgentSpec,
				prompt: 'Read the contents of /etc/hostname and tell me what it says.',
			});

			// read-only sandbox mode permits all reads — no permission event.
			const readPermissions = permissions.filter(
				(p) => p.toolCall.kind === 'read',
			);
			expect(readPermissions).toHaveLength(0);
		},
		TIMEOUT,
	);

	// ------------------------------------------------------------------
	// File write — requires permission in read-only sandbox
	// ------------------------------------------------------------------
	it(
		'writing a file triggers a requestPermission',
		async () => {
			const { permissions } = await runSandboxTest({
				spec: codexAgentSpec,
				prompt:
					'Write the word "hello" to a new file called test.txt in the current directory. Do not ask questions, just do it.',
			});

			// Codex may write via a direct edit (kind="edit") or via a shell
			// command like `printf > test.txt` (kind="execute"). Both should
			// trigger a requestPermission in read-only sandbox mode.
			const writePermissions = permissions.filter(
				(p) => p.toolCall.kind === 'edit' || p.toolCall.kind === 'execute',
			);
			expect(writePermissions.length).toBeGreaterThanOrEqual(1);

			// Verify the permission has allow/reject options
			const perm = writePermissions[0]!;
			const hasAllow = perm.options.some((o) => o.kind === 'allow_once');
			const hasReject = perm.options.some((o) => o.kind === 'reject_once');
			expect(hasAllow).toBe(true);
			expect(hasReject).toBe(true);
		},
		TIMEOUT,
	);
});
