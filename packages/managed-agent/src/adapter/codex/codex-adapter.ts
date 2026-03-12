import type { ManagedAgentCommand } from '../../messages/command.js';
import type { ManagedAgentCommandResult } from '../../messages/result.js';
import type { AdapterEventHandler, ManagedAgentAdapter } from '../types.js';
import {
	createCodexTransport,
	type CodexTransportOptions,
} from './transport/index.js';
import type { CodexTransport } from './transport/types.js';

// ---------------------------------------------------------------------------
// CodexAdapter — thin dispatcher that delegates to a CodexTransport.
// ---------------------------------------------------------------------------

export interface CodexAdapterOptions {
	onEvent: AdapterEventHandler;
	/** Transport options. Defaults to process transport. */
	transport?: CodexTransportOptions;
	/** Thread ID for session.resume. Temporary until SessionRef is filled in. */
	threadId?: string;
}

export class CodexAdapter implements ManagedAgentAdapter {
	private readonly onEvent: AdapterEventHandler;
	private readonly transport: CodexTransport;
	private readonly initialThreadId: string | undefined;

	constructor(options: CodexAdapterOptions) {
		this.onEvent = options.onEvent;
		this.initialThreadId = options.threadId;
		this.transport = createCodexTransport(options.transport, this.onEvent);
	}

	// -- ManagedAgentAdapter ---------------------------------------------------

	async dispatch(
		command: ManagedAgentCommand,
	): Promise<ManagedAgentCommandResult> {
		try {
			switch (command.type) {
				case 'session.start':
					await this.transport.startSession();
					return { ok: true };

				case 'session.resume': {
					const threadId = this.initialThreadId ?? this.transport.threadId;
					if (!threadId) {
						return {
							ok: false,
							error: {
								code: 'NO_THREAD_ID',
								message: 'Cannot resume without a threadId',
							},
						};
					}
					await this.transport.startSession(threadId);
					return { ok: true };
				}

				case 'session.fork':
					if (!this.transport.threadId) {
						return {
							ok: false,
							error: {
								code: 'NO_THREAD_ID',
								message: 'Cannot fork without a threadId',
							},
						};
					}
					await this.transport.forkSession();
					return { ok: true };

				case 'turn.start':
					await this.transport.startTurn(command.input);
					return { ok: true };

				case 'turn.interrupt':
					await this.transport.interruptTurn();
					return { ok: true };

				case 'permission.resolve':
					this.transport.resolvePermission(command.decision);
					return { ok: true };
			}

			const _exhaustive: never = command;
			return _exhaustive;
		} catch (err) {
			return {
				ok: false,
				error: {
					code: 'DISPATCH_ERROR',
					message: err instanceof Error ? err.message : String(err),
				},
			};
		}
	}

	async dispose(): Promise<void> {
		await this.transport.shutdown();
	}
}
