import type { ProcessOutput } from '@franklin/lib';

export type CommandSuccess = { status: 'fulfilled'; value: ProcessOutput };
export type CommandFailure = { status: 'rejected'; reason: unknown };
export type CommandOutcome = CommandSuccess | CommandFailure;

export type ReusableExecution = {
	outcome: CommandOutcome;
	runtime: 'reusable';
};
export type InvalidatedExecution = {
	outcome: CommandFailure;
	runtime: 'needs-reset';
};
export type ExecutionResult = ReusableExecution | InvalidatedExecution;
