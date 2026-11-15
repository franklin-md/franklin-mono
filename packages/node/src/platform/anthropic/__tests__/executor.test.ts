import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChildProcess, spawn } from 'node:child_process';
import type * as ChildProcessModule from 'node:child_process';
import { PassThrough } from 'node:stream';
import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import { execute } from '../executor/index.js';

vi.mock('node:child_process', async (importOriginal) => ({
	...(await importOriginal<typeof ChildProcessModule>()),
	spawn: vi.fn(),
}));
vi.mock('@anthropic-ai/sandbox-runtime', () => ({
	SandboxManager: {
		wrapWithSandbox: vi.fn(async () => 'prepared'),
		cleanupAfterCommand: vi.fn(),
	},
}));

beforeEach(() => vi.clearAllMocks());

describe('sandbox executor', () => {
	it('retains ownership after a child error until close, then cleans up once', async () => {
		const child = new ChildProcess();
		child.stdout = new PassThrough();
		child.stderr = new PassThrough();
		vi.mocked(spawn).mockReturnValueOnce(child);
		const settled = vi.fn();
		const completion = execute(
			{ file: 'command' },
			{
				network: { allowedDomains: [], deniedDomains: [] },
				filesystem: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			},
		).then((result) => {
			settled();
			return result;
		});
		await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
		const error = new Error('child failed');
		child.emit('error', error);
		await Promise.resolve();
		expect(settled).not.toHaveBeenCalled();
		expect(SandboxManager.cleanupAfterCommand).not.toHaveBeenCalled();
		child.emit('close', 1, null);
		expect(await completion).toEqual({
			outcome: { status: 'rejected', reason: error },
			runtime: 'reusable',
		});
		expect(SandboxManager.cleanupAfterCommand).toHaveBeenCalledOnce();
	});
});
