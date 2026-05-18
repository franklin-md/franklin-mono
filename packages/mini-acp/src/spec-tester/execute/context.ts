// ---------------------------------------------------------------------------
// Execution context — wires up the Mini-ACP client, tool handlers, and
// provides recording primitives for the action loop.
// ---------------------------------------------------------------------------

import { withDeadline } from '@franklin/lib';

import type { ToolCall, ToolResult } from '../../types/tool.js';
import type { ContextPatch } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import type {
	AgentFactory,
	SetContextPayload,
	TranscriptEntry,
} from '../types.js';

const DEFAULT_WAIT_TIMEOUT_MS = 5000;

export type ExecutionContext = Awaited<ReturnType<typeof createContext>>;

export async function createContext(factory: AgentFactory) {
	const transcript: TranscriptEntry[] = [];
	const backgroundPromises: Promise<void>[] = [];

	// Listener for waitFor — notified on every new transcript entry
	let onEntry: ((entry: TranscriptEntry) => void) | null = null;

	function record(entry: TranscriptEntry) {
		transcript.push(entry);
		onEntry?.(entry);
	}

	// Tool handlers registered dynamically via setContext actions
	const toolHandlers: Record<
		string,
		(call: ToolCall) => ToolResult | Promise<ToolResult>
	> = {};

	const client = await factory({
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

	// -----------------------------------------------------------------------
	// Actions
	// -----------------------------------------------------------------------

	async function initialize(): Promise<void> {
		record({ direction: 'send', method: 'initialize', params: {} });
		await client.initialize();
		record({ direction: 'receive', method: 'initialize', params: {} });
	}

	async function setContext(payload: SetContextPayload): Promise<void> {
		// Split ToolSpecs into definitions for the agent and local handlers.
		const context: ContextPatch = {};
		if (payload.history) context.history = payload.history;
		if (payload.config) context.config = payload.config;
		if (payload.tools) {
			context.tools = payload.tools.map((t) => t.definition);
			for (const t of payload.tools) {
				toolHandlers[t.definition.name] = t.handler;
			}
		}

		record({ direction: 'send', method: 'setContext', params: context });
		await client.setContext(context);
		record({ direction: 'receive', method: 'setContext', params: {} });
	}

	function prompt(message: UserMessage): void {
		record({ direction: 'send', method: 'prompt', params: message });
		backgroundPromises.push(consume(client.prompt(message)));
	}

	function cancel(): void {
		record({ direction: 'send', method: 'cancel', params: {} });
		void client.cancel();
	}

	async function waitFor(
		predicate: (entry: TranscriptEntry) => boolean,
		timeoutMs?: number,
	): Promise<void> {
		if (transcript.some(predicate)) return;

		const ms = timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
		await withDeadline(
			new Promise<void>((resolve) => {
				onEntry = (entry) => {
					if (predicate(entry)) resolve();
				};
			}),
			ms,
			'waitFor',
		).finally(() => {
			onEntry = null;
		});
	}

	async function drain(): Promise<void> {
		await Promise.all(backgroundPromises);
	}

	// -----------------------------------------------------------------------
	// Internal
	// -----------------------------------------------------------------------

	async function consume(iter: AsyncIterable<{ type: string }>): Promise<void> {
		for await (const event of iter) {
			record({
				direction: 'receive',
				method: event.type,
				params: event,
			} as TranscriptEntry);
		}
	}

	return { transcript, initialize, setContext, prompt, cancel, waitFor, drain };
}
