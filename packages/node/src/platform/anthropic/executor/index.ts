import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import type { ProcessInput } from '@franklin/lib';
import { failure } from './failure.js';
import { prepare } from './prepare.js';
import { run } from './run.js';
import type { CommandOutcome, ExecutionResult } from './types.js';

// After successful preparation, waits for child close and attempts cleanup.
// Command errors are outcomes; cleanup errors also invalidate the shared runtime.
export async function execute(
	input: ProcessInput,
	config: SandboxRuntimeConfig,
): Promise<ExecutionResult> {
	let command: string;
	try {
		command = await prepare(input, config);
	} catch (error) {
		// SRT rolls back its Linux active-command count when preparation throws.
		// Cleaning up here would release another command's deny-path mounts.
		// https://github.com/anthropics/sandbox-runtime/blob/v0.0.46/src/sandbox/linux-sandbox-utils.ts
		return { outcome: failure(error), runtime: 'reusable' };
	}

	let outcome: CommandOutcome;
	try {
		outcome = { status: 'fulfilled', value: await run(command, input) };
	} catch (error) {
		outcome = failure(error);
	}

	try {
		SandboxManager.cleanupAfterCommand();
	} catch (error) {
		const reason =
			outcome.status === 'rejected'
				? new AggregateError(
						[outcome.reason, error],
						'Sandbox execution and cleanup failed',
					)
				: error;
		return { outcome: failure(reason), runtime: 'needs-reset' };
	}
	return { outcome, runtime: 'reusable' };
}
