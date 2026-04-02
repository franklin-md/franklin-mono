// ---------------------------------------------------------------------------
// Execution context — wires up transport, connection, tool handlers,
// and provides recording primitives for the action loop.
// ---------------------------------------------------------------------------

import { createDuplexPair } from '@franklin/transport';
import type { JsonRpcMessage } from '@franklin/transport';

import { createClientConnection } from '../../protocol/connection.js';
import type { ToolCall, ToolResult } from '../../types/tool.js';
import type { Ctx } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import type { Fixture, AgentFactory, TranscriptEntry } from '../types.js';

const DEFAULT_WAIT_TIMEOUT_MS = 5000;

export type ExecutionContext = ReturnType<typeof createContext>;

export function createContext(fixture: Fixture, factory: AgentFactory) {
	const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
	const transcript: TranscriptEntry[] = [];
	const backgroundPromises: Promise<void>[] = [];

	// Listener for waitFor — notified on every new transcript entry
	let onEntry: ((entry: TranscriptEntry) => void) | null = null;

	function record(entry: TranscriptEntry) {
		transcript.push(entry);
		onEntry?.(entry);
	}

	// Derive tool handlers from fixture.tools
	const toolHandlers: Record<
		string,
		(call: ToolCall) => ToolResult | Promise<ToolResult>
	> = {};
	for (const t of fixture.tools ?? []) {
		toolHandlers[t.definition.name] = t.handler;
	}

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
					`A tool handler must be specified in the fixture for tool: ${call.name}`,
				);
			}

			const result = await handler(call);
			record({ direction: 'send', method: 'toolResult', params: result });
			return result;
		},
	});

	factory(agentSide);

	// Fixture-level tool definitions (for merging into setContext)
	const fixtureToolDefs = (fixture.tools ?? []).map((t) => t.definition);

	// -----------------------------------------------------------------------
	// Actions
	// -----------------------------------------------------------------------

	async function initialize(): Promise<void> {
		record({ direction: 'send', method: 'initialize', params: {} });
		await connection.remote.initialize({});
		record({ direction: 'receive', method: 'initialize', params: {} });
	}

	async function setContext(ctx: Partial<Ctx>): Promise<void> {
		const merged = { ...ctx };
		if (fixtureToolDefs.length > 0) {
			merged.tools = [...(merged.tools ?? []), ...fixtureToolDefs];
		}
		const params = { ctx: merged };
		record({ direction: 'send', method: 'setContext', params });
		await connection.remote.setContext(params);
		record({ direction: 'receive', method: 'setContext', params: {} });
	}

	function prompt(message: UserMessage): void {
		const params = { message };
		record({ direction: 'send', method: 'prompt', params });
		backgroundPromises.push(consume(connection.remote.prompt(params)));
	}

	function cancel(): void {
		record({ direction: 'send', method: 'cancel', params: {} });
		void connection.remote.cancel({});
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
