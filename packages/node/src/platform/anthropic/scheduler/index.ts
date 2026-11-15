import type { ProcessOutput } from '@franklin/lib';
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import * as executor from '../executor/index.js';
import type { ExecutionResult } from '../executor/types.js';
import { RequestQueue } from './queue.js';
import { selectAdmission } from './policy.js';
import type {
	ActiveWork,
	Request,
	SandboxTask,
	SchedulerRuntime,
	State,
} from './types.js';

export class SandboxScheduler {
	private readonly queue = new RequestQueue();
	private readonly runtime: SchedulerRuntime;
	private state: State = { kind: 'idle' };

	constructor(runtime: SchedulerRuntime) {
		this.runtime = { ...runtime };
	}

	// TODO(franklin-frc): queued cancellation and scheduler deadlines. Existing
	// ProcessInput.timeout applies only after spawning; it does not cancel a wait.
	schedule(task: SandboxTask): Promise<ProcessOutput> {
		if (this.state.kind === 'failed') return Promise.reject(this.state.error);
		const snapshot = structuredClone(task);
		return new Promise((resolve, reject) => {
			this.queue.enqueue({
				...snapshot,
				resolve,
				reject,
			});
			this.pump();
		});
	}

	private pump(): void {
		for (;;) {
			switch (this.state.kind) {
				case 'failed':
				case 'switching':
				case 'recovering':
				case 'draining':
					return;
				case 'idle':
				case 'running': {
					const { next_request, requires_switch } = selectAdmission(
						this.queue,
						this.state.config,
					);
					if (!next_request) return;
					if (requires_switch) {
						if (this.state.kind === 'running') {
							this.state = {
								...this.state,
								kind: 'draining',
								reason: { kind: 'policy-change' },
							};
							return;
						}
						const previous = this.state.config;
						this.state = { kind: 'switching' };
						void this.switchTo(next_request, previous);
						return;
					}
					if (this.state.kind === 'idle') {
						this.state = {
							kind: 'running',
							config: next_request.config,
							active: new Set(),
						};
					}
					this.queue.take(next_request);
					this.state.active.add(next_request);
					void this.start(next_request, this.state);
					break;
				}
			}
		}
	}

	private async switchTo(request: Request, previous?: SandboxRuntimeConfig) {
		try {
			await this.runtime.switchConfig(previous, request.config);
			this.state = { kind: 'idle', config: request.config };
		} catch (error) {
			if (await this.recover(error)) {
				this.queue.take(request);
				request.reject(error);
			}
		}
		this.pump();
	}

	private async recover(error: unknown): Promise<boolean> {
		this.state = { kind: 'recovering' };
		try {
			await this.runtime.reset();
			this.state = { kind: 'idle' };
			return true;
		} catch (resetError) {
			const failure = new AggregateError(
				[error, resetError],
				'Sandbox recovery failed',
			);
			this.state = { kind: 'failed', error: failure };
			this.queue.rejectAll(failure);
			return false;
		}
	}

	private async start(request: Request, running: ActiveWork) {
		const result = await executor.execute(request.input, request.config);
		this.finish(request, running, result);
		if (result.outcome.status === 'fulfilled')
			request.resolve(result.outcome.value);
		else request.reject(result.outcome.reason);
		this.pump();
	}

	private finish(
		request: Request,
		running: ActiveWork,
		result: ExecutionResult,
	): void {
		// Executor completion includes the child's close and command cleanup.
		// A recovery request must survive other active commands finishing normally.
		running.active.delete(request);
		if (result.runtime === 'needs-reset') {
			this.state = {
				...running,
				kind: 'draining',
				reason: {
					kind: 'recovery',
					error: result.outcome.reason,
				},
			};
		}
		if (running.active.size !== 0) return;
		if (
			this.state.kind === 'draining' &&
			this.state.reason.kind === 'recovery'
		) {
			void this.recover(this.state.reason.error).then(() => this.pump());
		} else {
			this.state = { kind: 'idle', config: running.config };
		}
	}
}
