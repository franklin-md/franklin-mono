import { describe, expect, it } from 'vitest';

import { createAgentConnection } from '../../protocol/connection.js';
import { createSessionAdapter } from '../../protocol/adapter.js';
import type { TurnClient } from '../../base/types.js';
import type { MuAgent } from '../../protocol/types.js';
import type { StreamEvent } from '../../types/stream.js';
import { StopCode } from '../../types/stop-code.js';
import type { AgentFactory, TranscriptEntry } from '../types.js';
import { execute } from '../execute/index.js';
import { initialize } from '../actions/initialize.js';
import { setContext } from '../actions/set-context.js';
import { prompt } from '../actions/prompt.js';
import { waitFor } from '../actions/wait-for.js';
import { failingTool } from '../fixtures/tools/failing.js';
import { echoTool } from '../fixtures/tools/echo.js';
import {
	VALID_LLM_CONFIG_PLACEHOLDER,
	createValidLLMConfig,
	withLLMConfig,
} from '../../__tests__/utils/llm-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a factory that binds a mock agent using createSessionAdapter. */
function createMockFactory(
	createTurnClient: (remote: MuAgent) => TurnClient,
): AgentFactory {
	return (transport) => {
		const conn = createAgentConnection(transport);
		const adapter = createSessionAdapter(
			(_ctx) => createTurnClient(conn.remote),
			conn.remote,
		);
		conn.bind(adapter);
	};
}

const noopTurn = (_remote: MuAgent): TurnClient => ({
	async *prompt(): AsyncGenerator<StreamEvent> {
		yield { type: 'turnStart' };
		yield { type: 'turnEnd', stopCode: StopCode.Finished };
	},
	async cancel() {},
});

const toolCallingTurn = (remote: MuAgent): TurnClient => ({
	async *prompt(): AsyncGenerator<StreamEvent> {
		yield { type: 'turnStart' };
		const result = await remote.toolExecute({
			call: {
				type: 'toolCall',
				id: 'tc-1',
				name: 'greet',
				arguments: { name: 'World' },
			},
		});
		yield {
			type: 'update',
			messageId: 'mock-msg-1',
			message: {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: `Got: ${result.content[0]?.type === 'text' ? result.content[0].text : ''}`,
					},
				],
			},
		};
		yield { type: 'turnEnd', stopCode: StopCode.Finished };
	},
	async cancel() {},
});

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

describe('execute', () => {
	it('init-only fixture produces send/receive initialize entries', async () => {
		const transcript = await execute(
			{ name: 'init-only', actions: [initialize()] },
			createMockFactory(noopTurn),
		);

		expect(transcript).toEqual([
			{ direction: 'send', method: 'initialize', params: {} },
			{ direction: 'receive', method: 'initialize', params: {} },
		]);
	});

	it('simple-prompt fixture produces full turn transcript', async () => {
		const transcript = await execute(
			{
				name: 'simple-prompt',
				actions: [initialize(), setContext(), prompt('Hello')],
			},
			createMockFactory(noopTurn),
		);

		const methods = transcript.map(
			(e: TranscriptEntry) => `${e.direction}:${e.method}`,
		);
		expect(methods).toEqual([
			'send:initialize',
			'receive:initialize',
			'send:setContext',
			'receive:setContext',
			'send:prompt',
			'receive:turnStart',
			'receive:turnEnd',
		]);
	});

	it('tool-call fixture records toolExecute and toolResult in order', async () => {
		const transcript = await execute(
			{
				name: 'tool-call',
				actions: [
					initialize(),
					setContext({ tools: [echoTool('greet')] }),
					prompt('Greet the world'),
				],
			},
			createMockFactory(toolCallingTurn),
		);

		const methods = transcript.map(
			(e: TranscriptEntry) => `${e.direction}:${e.method}`,
		);
		expect(methods).toEqual([
			'send:initialize',
			'receive:initialize',
			'send:setContext',
			'receive:setContext',
			'send:prompt',
			'receive:turnStart',
			'receive:toolExecute',
			'send:toolResult',
			'receive:update',
			'receive:turnEnd',
		]);

		// Verify tool call data
		const toolExec = transcript.find(
			(e: TranscriptEntry) => e.method === 'toolExecute',
		) as TranscriptEntry & { params: { call: { name: string } } };
		expect(toolExec.params.call.name).toBe('greet');

		const toolResult = transcript.find(
			(e: TranscriptEntry) => e.method === 'toolResult',
		) as TranscriptEntry & { params: { content: { text: string }[] } };
		expect(toolResult.params.content[0]!.text).toContain('World');
	});

	it('prompt with waitFor pauses until predicate matches', async () => {
		const transcript = await execute(
			{
				name: 'waitFor-test',
				actions: [
					initialize(),
					setContext({ tools: [echoTool('greet')] }),
					prompt('Greet'),
					waitFor((e: TranscriptEntry) => e.method === 'toolExecute'),
				],
			},
			createMockFactory(toolCallingTurn),
		);

		// waitFor should have resolved after toolExecute arrived
		const toolIdx = transcript.findIndex(
			(e: TranscriptEntry) => e.method === 'toolExecute',
		);
		expect(toolIdx).toBeGreaterThan(-1);
	});

	it('prompt consumes stream and awaits completion', async () => {
		const transcript = await execute(
			{
				name: 'prompt-completion',
				actions: [initialize(), setContext(), prompt('Hello')],
			},
			createMockFactory(noopTurn),
		);

		// Prompt still produces a complete transcript
		const methods = transcript.map(
			(e: TranscriptEntry) => `${e.direction}:${e.method}`,
		);
		expect(methods).toEqual([
			'send:initialize',
			'receive:initialize',
			'send:setContext',
			'receive:setContext',
			'send:prompt',
			'receive:turnStart',
			'receive:turnEnd',
		]);
	});

	it('waitFor times out when predicate never matches', async () => {
		await expect(
			execute(
				{
					name: 'waitFor-timeout',
					actions: [initialize(), waitFor(() => false, 50)],
				},
				createMockFactory(noopTurn),
			),
		).rejects.toThrow('waitFor timed out');
	});

	it('waitFor resolves immediately if predicate already matched', async () => {
		const transcript = await execute(
			{
				name: 'waitFor-already-matched',
				actions: [
					initialize(),
					waitFor(
						(e: TranscriptEntry) =>
							e.direction === 'send' && e.method === 'initialize',
						50,
					),
				],
			},
			createMockFactory(noopTurn),
		);

		// Should have completed without timeout since initialize already happened
		expect(transcript.length).toBeGreaterThan(0);
	});

	it('unknown tool throws a fixture authoring error', async () => {
		// Agent calls 'greet' but no tools registered on fixture — this is a
		// fixture mistake, not a protocol error, so execute should reject.
		await expect(
			execute(
				{
					name: 'unknown-tool',
					actions: [initialize(), setContext(), prompt('Greet')],
				},
				createMockFactory(toolCallingTurn),
			),
		).rejects.toThrow('tool handler must be specified');
	});

	it('tools in setContext are sent as definitions on the wire', async () => {
		const tool = echoTool('myTool');
		const transcript = await execute(
			{
				name: 'tool-in-setContext',
				actions: [initialize(), setContext({ tools: [tool] }), prompt('Hello')],
			},
			createMockFactory(noopTurn),
		);

		const setCtxEntry = transcript.find(
			(e: TranscriptEntry) =>
				e.direction === 'send' && e.method === 'setContext',
		) as TranscriptEntry & {
			params: { tools?: { name: string }[] };
		};
		expect(setCtxEntry.params.tools).toEqual([tool.definition]);
	});
});

// ---------------------------------------------------------------------------
// tool spec helpers
// ---------------------------------------------------------------------------

describe('tool spec helpers', () => {
	it('echoTool echoes arguments back', () => {
		const tool = echoTool();
		const result = tool.handler({
			type: 'toolCall',
			id: 'tc-1',
			name: 'echo',
			arguments: { foo: 'bar' },
		});
		expect(result).toEqual({
			toolCallId: 'tc-1',
			content: [{ type: 'text', text: '{"foo":"bar"}' }],
		});
	});

	it('failingTool returns isError result', () => {
		const tool = failingTool('bad', 'something broke');
		const result = tool.handler({
			type: 'toolCall',
			id: 'tc-2',
			name: 'bad',
			arguments: {},
		});
		expect(result).toEqual({
			toolCallId: 'tc-2',
			content: [{ type: 'text', text: 'something broke' }],
			isError: true,
		});
	});

	it('failingTool produces error in transcript', async () => {
		const tool = failingTool('bad');
		const transcript = await execute(
			{
				name: 'failing-tool-test',
				actions: [
					initialize(),
					setContext({ tools: [tool] }),
					prompt('Use the tool'),
				],
			},
			createMockFactory(
				(remote: MuAgent): TurnClient => ({
					async *prompt(): AsyncGenerator<StreamEvent> {
						yield { type: 'turnStart' };
						await remote.toolExecute({
							call: {
								type: 'toolCall',
								id: 'tc-1',
								name: 'bad',
								arguments: {},
							},
						});
						yield { type: 'turnEnd', stopCode: StopCode.Finished };
					},
					async cancel() {},
				}),
			),
		);

		const toolResult = transcript.find(
			(e: TranscriptEntry) =>
				e.direction === 'send' && e.method === 'toolResult',
		);
		expect(toolResult).toBeDefined();
		expect(
			(toolResult as TranscriptEntry & { params: { isError?: boolean } }).params
				.isError,
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// action factories
// ---------------------------------------------------------------------------

describe('action factories', () => {
	it('initialize() returns initialize action', () => {
		expect(initialize()).toEqual({ type: 'initialize' });
	});

	it('prompt() wraps text into UserMessage', () => {
		expect(prompt('hello')).toEqual({
			type: 'prompt',
			message: {
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			},
		});
	});

	it('setContext() with no args produces empty partial', () => {
		const action = setContext();
		expect(action).toEqual({
			type: 'setContext',
			ctx: {},
		});
	});

	it('setContext() accepts tools and custom system prompt', () => {
		const tool = echoTool('myTool');
		const action = setContext({
			systemPrompt: 'Custom prompt',
			tools: [tool],
		});
		expect(action).toEqual({
			type: 'setContext',
			ctx: {
				history: {
					systemPrompt: 'Custom prompt',
					messages: [],
				},
				tools: [tool],
			},
		});
	});

	it('setContext() accepts messages', () => {
		const action = setContext({
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: 'previous message' }],
				},
			],
		});
		expect(action).toEqual({
			type: 'setContext',
			ctx: {
				history: {
					systemPrompt: 'You are a test agent.',
					messages: [
						{
							role: 'user',
							content: [{ type: 'text', text: 'previous message' }],
						},
					],
				},
			},
		});
	});

	it('setContext() accepts config', () => {
		const action = setContext({
			config: { provider: 'openrouter', model: 'openrouter/free' },
		});
		expect(action).toEqual({
			type: 'setContext',
			ctx: {
				config: {
					provider: 'openrouter',
					model: 'openrouter/free',
				},
			},
		});
	});
});

describe('llm config helpers', () => {
	it('withLLMConfig replaces only placeholder configs in setContext actions', () => {
		const entries = withLLMConfig(
			[
				{
					fixture: {
						name: 'placeholder',
						actions: [
							initialize(),
							setContext({ config: VALID_LLM_CONFIG_PLACEHOLDER }),
						],
					},
					expectations: [],
				},
				{
					fixture: {
						name: 'explicit-invalid',
						actions: [
							initialize(),
							setContext({
								config: {
									provider: 'broken',
									model: 'nope',
									apiKey: 'bad',
								},
							}),
						],
					},
					expectations: [],
				},
			],
			createValidLLMConfig('secret'),
		);

		expect(entries[0]!.fixture.actions[1]).toEqual(
			setContext({
				config: {
					provider: 'openrouter',
					model: 'openrouter/free',
					apiKey: 'secret',
				},
			}),
		);
		expect(entries[1]!.fixture.actions[1]).toEqual(
			setContext({
				config: { provider: 'broken', model: 'nope', apiKey: 'bad' },
			}),
		);
	});
});
