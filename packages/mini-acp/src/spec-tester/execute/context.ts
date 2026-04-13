// ---------------------------------------------------------------------------
// Execution context — wires up transport, connection, tool handlers,
// and provides recording primitives for the action loop.
// ---------------------------------------------------------------------------

import { createDuplexPair } from '@franklin/transport';
import type { JsonRpcMessage } from '@franklin/transport';
import { RpcError } from '@franklin/transport';

import { createClientConnection } from '../../protocol/connection.js';
import type { ToolCall, ToolResult } from '../../types/tool.js';
import type { Ctx } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import type {
	AgentFactory,
	SetContextPayload,
	TranscriptEntry,
	TranscriptErrorOperation,
} from '../types.js';

const DEFAULT_WAIT_TIMEOUT_MS = 5000;

export type ExecutionContext = ReturnType<typeof createContext>;

export function createContext(factory: AgentFactory) {
	const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
	const transcript: TranscriptEntry[] = [];
	const backgroundPromises: Promise<void>[] = [];

	// Listener for waitFor — notified on every new transcript entry
	let onEntry: ((entry: TranscriptEntry) => void) | null = null;

	function record(entry: TranscriptEntry) {
		transcript.push(entry);
		onEntry?.(entry);
	}

	function recordError(
		operation: TranscriptErrorOperation,
		error: unknown,
	): void {
		record({
			direction: 'receive',
			method: 'error',
			params: {
				operation,
				message: error instanceof Error ? error.message : String(error),
				...(error instanceof RpcError && {
					code: error.code,
					data: error.data,
				}),
			},
		});
	}

	async function withRecordedError(
		operation: TranscriptErrorOperation,
		run: () => Promise<void>,
	): Promise<void> {
		try {
			await run();
		} catch (error) {
			recordError(operation, error);
		}
	}

	// Tool handlers registered dynamically via setContext actions
	const toolHandlers: Record<
		string,
		(call: ToolCall) => ToolResult | Promise<ToolResult>
	> = {};

	const connection = createClientConnection(clientSide);

	connection.bind({
		toolExecute: async ({ call }) => {
			record({
				direction: 'receive',
				method: 'toolExecute',
				params: { call },
			});

			const handler = toolHandlers[call.name];
			if (!handler) {
				throw new Error(
					`A tool handler must be specified in setContext for tool: ${call.name}`,
				);
			}

			const result = await handler(call);
			record({ direction: 'send', method: 'toolResult', params: result });
			return result;
		},
	});

	factory(agentSide);

	// -----------------------------------------------------------------------
	// Actions
	// -----------------------------------------------------------------------

	async function initialize(): Promise<void> {
		record({ direction: 'send', method: 'initialize', params: {} });
		await withRecordedError('initialize', async () => {
			await connection.remote.initialize();
			record({ direction: 'receive', method: 'initialize', params: {} });
		});
	}

	async function setContext(payload: SetContextPayload): Promise<void> {
		// Split ToolSpecs into definitions (for the wire) and handlers (local)
		const ctx: Partial<Ctx> = {};
		if (payload.history) ctx.history = payload.history;
		if (payload.config) ctx.config = payload.config;
		if (payload.tools) {
			ctx.tools = payload.tools.map((t) => t.definition);
			for (const t of payload.tools) {
				toolHandlers[t.definition.name] = t.handler;
			}
		}

		record({ direction: 'send', method: 'setContext', params: ctx });
		await withRecordedError('setContext', async () => {
			await connection.remote.setContext(ctx);
			record({ direction: 'receive', method: 'setContext', params: {} });
		});
	}

	function prompt(message: UserMessage): void {
		record({ direction: 'send', method: 'prompt', params: message });
		backgroundPromises.push(
			consume('prompt', connection.remote.prompt(message)),
		);
	}

	function cancel(): void {
		record({ direction: 'send', method: 'cancel', params: {} });
		void connection.remote.cancel();
	}

	async function waitFor(
		predicate: (entry: TranscriptEntry) => boolean,
		timeoutMs?: number,
	): Promise<void> {
		if (transcript.some(predicate)) return;

		const ms = timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				onEntry = null;
				reject(new Error('waitFor timed out'));
			}, ms);
			onEntry = (entry) => {
				if (predicate(entry)) {
					clearTimeout(timer);
					onEntry = null;
					resolve();
				}
			};
		});
	}

	async function drain(): Promise<void> {
		await Promise.all(backgroundPromises);
	}

	// -----------------------------------------------------------------------
	// Internal
	// -----------------------------------------------------------------------

	async function consume(
		operation: TranscriptErrorOperation,
		iter: AsyncIterable<{ type: string }>,
	): Promise<void> {
		await withRecordedError(operation, async () => {
			for await (const event of iter) {
				record({
					direction: 'receive',
					method: event.type,
					params: event,
				} as TranscriptEntry);
			}
		});
	}

	return { transcript, initialize, setContext, prompt, cancel, waitFor, drain };
}
