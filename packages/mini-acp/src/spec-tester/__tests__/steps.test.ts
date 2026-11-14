import { describe, expect, it } from 'vitest';
import {
	execute,
	initialize,
	setContext,
	prompt,
	continueTurn,
	cancel,
	waitFor,
	specPoints,
} from '../index.js';
import { createPiAgent } from '../../backend/pi/agent.js';
import { createScriptedProvider } from '../../mock/provider.js';
import {
	createMockMiniACP,
	toolCalls,
	text,
	turnEnd,
	turn,
} from '../../mock/index.js';
import type { AgentFactory, Fixture, Transcript } from '../types.js';

const config = {
	provider: 'openrouter',
	model: 'openrouter/free',
	apiKey: 'stub-key',
};
const tool = {
	definition: {
		name: 'echo',
		description: 'Echo',
		inputSchema: { type: 'object' },
	},
	handler: () => ({ toolCallId: 'c1', content: [] }),
};
const fixture: Fixture = {
	name: 'explicit stepping',
	actions: [
		initialize(),
		setContext({ config, tools: [tool] }),
		prompt('hello'),
		waitFor((e) => e.method === 'stepEnd'),
		setContext({ systemPrompt: 'idle edit' }),
		continueTurn(),
		waitFor((e) => e.method === 'turnEnd'),
		continueTurn(),
	],
};

function expectConforms(transcript: Transcript) {
	expect(
		specPoints
			.filter((spec) => spec.test(transcript) === 'fail')
			.map((spec) => spec.id),
	).toEqual([]);
}

describe('explicit step executable spec', () => {
	it.each(['pi', 'mock'])(
		'conforms across prompt/continue/setContext and no-op continue: %s',
		async (kind) => {
			const provider = createScriptedProvider([
				{
					content: [
						{ type: 'toolCall', name: 'echo', id: 'c1', arguments: {} },
					],
					stopReason: 'toolUse',
				},
				{},
			]);
			const factory: AgentFactory =
				kind === 'pi'
					? (server) => createPiAgent(server, provider)
					: createMockMiniACP({
							turns: [
								turn([toolCalls([{ name: 'echo' }]), text('done'), turnEnd()]),
							],
						}).connector;
			const transcript = await execute(
				{
					...fixture,
					actions: fixture.actions.map((action) =>
						action.type === 'setContext' && action.context.tools
							? {
									...action,
									context: {
										...action.context,
										tools: [
											{
												...tool,
												handler: (call) => ({
													toolCallId: call.id,
													content: [],
												}),
											},
										],
									},
								}
							: action,
					),
				},
				factory,
			);
			expectConforms(transcript);
			expect(transcript.filter((e) => e.method === 'stepEnd')).toHaveLength(1);
			expect(transcript.filter((e) => e.method === 'turnEnd')).toHaveLength(1);
			expect(transcript.filter((e) => e.method === 'prompt')).toHaveLength(1);
			expect(provider.requests).toHaveLength(kind === 'pi' ? 2 : 0);
		},
	);

	it('conforms when cancellation is requested at the paused boundary', async () => {
		const provider = createScriptedProvider([
			{
				content: [{ type: 'toolCall', name: 'echo', id: 'c1', arguments: {} }],
				stopReason: 'toolUse',
			},
		]);
		const transcript = await execute(
			{
				name: 'paused cancel',
				actions: [...fixture.actions.slice(0, 5), cancel(), continueTurn()],
			},
			(server) => createPiAgent(server, provider),
		);
		expectConforms(transcript);
		expect(provider.requests).toHaveLength(1);
	});

	it('rejects a stepEnd followed by turnEnd on the same drive', () => {
		const transcript: Transcript = [
			{
				direction: 'send',
				method: 'prompt',
				params: { role: 'user', content: [] },
			},
			{
				direction: 'receive',
				method: 'turnStart',
				params: { type: 'turnStart' },
			},
			{ direction: 'receive', method: 'stepEnd', params: { type: 'stepEnd' } },
			{
				direction: 'receive',
				method: 'turnEnd',
				params: { type: 'turnEnd', stopCode: 1000 },
			},
		];
		expect(
			specPoints
				.find((p) => p.id === 'one-terminal-per-step')
				?.test(transcript),
		).toBe('fail');
		expect(
			specPoints.find((p) => p.id === 'turn-end-is-terminal')?.test(transcript),
		).toBe('fail');
	});
});
