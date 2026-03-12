import type {
	AdapterEventHandler,
	AdapterOptions,
	ManagedAgentAdapter,
} from '../adapter/types.js';
import type { ManagedAgentCommand } from '../messages/command.js';
import type { ManagedAgentEvent } from '../messages/event.js';
import type {
	PermissionDecision,
	PermissionRequest,
} from '../messages/permission.js';
import type { ManagedAgentCommandResult } from '../messages/result.js';
import type { ManagedAgentError } from '../messages/shared.js';

// Handlers may return void (side-effects only) or an explicit result.
/* eslint-disable @typescript-eslint/no-invalid-void-type */
export type MockCommandHandler = (
	command: ManagedAgentCommand,
	agent: MockedAgent,
) =>
	| void
	| ManagedAgentCommandResult
	| Promise<void | ManagedAgentCommandResult>;
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export interface MockedAgentOptions {
	autoEmitSessionLifecycle?: boolean;
	commandHandler?: MockCommandHandler;
}

function ok(): ManagedAgentCommandResult {
	return { ok: true };
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

export class MockedAgent {
	readonly agentId: string;
	readonly commands: ManagedAgentCommand[] = [];

	private onEvent: AdapterEventHandler | null = null;
	private commandHandler: MockCommandHandler | undefined;
	private readonly autoEmitSessionLifecycle: boolean;

	constructor(agentId: string, options: MockedAgentOptions = {}) {
		this.agentId = agentId;
		this.commandHandler = options.commandHandler;
		this.autoEmitSessionLifecycle = options.autoEmitSessionLifecycle ?? true;
	}

	attach(onEvent: AdapterEventHandler): void {
		this.onEvent = onEvent;
	}

	detach(onEvent: AdapterEventHandler): void {
		if (this.onEvent === onEvent) {
			this.onEvent = null;
		}
	}

	setCommandHandler(handler: MockCommandHandler | undefined): void {
		this.commandHandler = handler;
	}

	clearCommands(): void {
		this.commands.length = 0;
	}

	emit(event: ManagedAgentEvent): void {
		if (!this.onEvent) {
			throw new Error(
				`MockedAgent "${this.agentId}" is not attached to an adapter`,
			);
		}
		this.onEvent(event);
	}

	startSession(): void {
		this.emit({ type: 'agent.ready' });
		this.emit({ type: 'session.started' });
	}

	resumeSession(): void {
		this.emit({ type: 'agent.ready' });
		this.emit({ type: 'session.resumed' });
	}

	forkSession(): void {
		this.emit({ type: 'agent.ready' });
		this.emit({ type: 'session.forked' });
	}

	requestPermission(request: string | PermissionRequest): void {
		this.emit({
			type: 'permission.requested',
			payload:
				typeof request === 'string'
					? { kind: 'generic', message: request }
					: request,
		});
	}

	resolvePermission(decision: PermissionDecision): void {
		this.emit({
			type: 'permission.resolved',
			payload: { decision },
		});
	}

	completeTextTurn(
		text: string,
		options: { stream?: boolean; userText?: string } = {},
	): void {
		if (options.userText) {
			this.emit({
				type: 'item.started',
				item: { kind: 'user_message', text: options.userText },
			});
			this.emit({
				type: 'item.completed',
				item: { kind: 'user_message', text: options.userText },
			});
		}

		this.emit({ type: 'turn.started' });
		this.emit({
			type: 'item.started',
			item: { kind: 'assistant_message' },
		});

		if (options.stream) {
			const chunks = text.split(' ');
			for (const [index, chunk] of chunks.entries()) {
				this.emit({
					type: 'item.delta',
					item: {
						kind: 'assistant_message',
						textDelta: index === chunks.length - 1 ? chunk : `${chunk} `,
					},
				});
			}
		}

		this.emit({
			type: 'item.completed',
			item: { kind: 'assistant_message', text },
		});
		this.emit({ type: 'turn.completed' });
	}

	fail(error: string | ManagedAgentError): void {
		this.emit({
			type: 'error',
			error:
				typeof error === 'string'
					? { code: 'MOCK_ERROR', message: error }
					: error,
		});
	}

	exit(): void {
		this.emit({ type: 'agent.exited' });
	}

	async dispatch(
		command: ManagedAgentCommand,
	): Promise<ManagedAgentCommandResult> {
		this.commands.push(command);

		if (this.autoEmitSessionLifecycle) {
			switch (command.type) {
				case 'session.start':
					this.startSession();
					break;
				case 'session.resume':
					this.resumeSession();
					break;
				case 'session.fork':
					this.forkSession();
					break;
				case 'turn.start':
				case 'turn.interrupt':
				case 'permission.resolve':
					break;
			}
		}

		if (!this.commandHandler) {
			return ok();
		}

		try {
			const result = (await this.commandHandler(command, this)) as
				| ManagedAgentCommandResult
				| undefined;
			return result ?? ok();
		} catch (error) {
			return {
				ok: false,
				error: {
					code: 'MOCK_COMMAND_HANDLER_ERROR',
					message: toErrorMessage(error),
				},
			};
		}
	}
}

export class MockAdapter implements ManagedAgentAdapter {
	private readonly mockedAgent: MockedAgent;
	private readonly onEvent: AdapterEventHandler;
	private disposed = false;

	constructor(options: AdapterOptions, mockedAgent: MockedAgent) {
		this.onEvent = options.onEvent;
		this.mockedAgent = mockedAgent;
		this.mockedAgent.attach(this.onEvent);
	}

	async dispatch(
		command: ManagedAgentCommand,
	): Promise<ManagedAgentCommandResult> {
		if (this.disposed) {
			return {
				ok: false,
				error: { code: 'DISPOSED', message: 'Adapter is disposed' },
			};
		}

		return this.mockedAgent.dispatch(command);
	}

	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		this.mockedAgent.detach(this.onEvent);
	}
}
