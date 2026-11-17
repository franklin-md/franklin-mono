import type { ProcessOutput } from '@franklin/lib';
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { execute } from '../execute.js';
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
							this.state = { ...this.state, kind: 'draining' };
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
			try {
				await this.runtime.reset();
				this.queue.take(request);
				this.state = { kind: 'idle' };
				request.reject(error);
			} catch (cleanupError) {
				const failure = new AggregateError(
					[error, cleanupError],
					'Sandbox configuration and recovery failed',
				);
				this.state = { kind: 'failed', error: failure };
				this.queue.rejectAll(failure);
			}
		}
		this.pump();
	}

	private async start(request: Request, running: ActiveWork) {
		try {
			const result = await execute(request.input, request.config);
			this.finish(request, running);
			request.resolve(result);
		} catch (error) {
			this.finish(request, running);
			request.reject(error);
		}
		this.pump();
	}

	private finish(request: Request, running: ActiveWork): void {
		// execute includes command cleanup. Settling a caller's promise alone is
		// never evidence that its use of the shared sandbox has ended.
		running.active.delete(request);
		if (running.active.size === 0)
			this.state = { kind: 'idle', config: running.config };
	}
}
