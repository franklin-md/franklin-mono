import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import type { ProcessInput, ProcessOutput } from '@franklin/lib';

export type SandboxConfig = SandboxRuntimeConfig & {
	// SRT inherits omitted fields from the manager, so every task must supply
	// allowRead explicitly, just like the other three required filesystem lists.
	filesystem: SandboxRuntimeConfig['filesystem'] & { allowRead: string[] };
};

export type SandboxTask = {
	input: ProcessInput;
	config: SandboxConfig;
};

export type Request = SandboxTask & {
	resolve: (result: ProcessOutput) => void;
	reject: (error: unknown) => void;
};

export type SchedulerRuntime = {
	switchConfig: (
		previous: SandboxRuntimeConfig | undefined,
		next: SandboxRuntimeConfig,
	) => Promise<void>;
	reset: () => Promise<void>;
};

export type Admission = {
	next_request: Request | undefined;
	requires_switch: boolean;
};

export type ActiveWork = {
	config: SandboxConfig;
	active: Set<Request>;
};

export type IdleState = { kind: 'idle'; config?: SandboxConfig };
export type SwitchingState = { kind: 'switching' };
export type RunningState = { kind: 'running' } & ActiveWork;
export type DrainingState = { kind: 'draining' } & ActiveWork;
export type FailedState = { kind: 'failed'; error: Error };

export type State =
	| IdleState
	| SwitchingState
	| RunningState
	| DrainingState
	| FailedState;
