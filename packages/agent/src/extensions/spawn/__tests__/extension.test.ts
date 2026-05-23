import {
	collect,
	StopCode,
	type ToolResult,
	type UserMessage,
} from '@franklin/mini-acp';
import {
	createMockMiniACP,
	text,
	toolCalls,
	turn,
	turnEnd,
	type CreateMockMiniACPOptions,
	type MockMiniACP,
} from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';
import { createCoreStateModule } from '../../../modules/core/module.js';
import {
	createOrchestrator,
	type OrchestratorRuntime,
	type RuntimeEntry,
} from '../../../modules/orchestrator/index.js';
import type { CoreStateModule } from '../../../modules/core/module.js';
import { spawnExtension } from '../index.js';
import type { RuntimeVisibility } from '../../../modules/orchestrator/internal/details/index.js';

type SpawnRuntime = OrchestratorRuntime<CoreStateModule>;

type SpawnScenario = {
	readonly mock: MockMiniACP;
	readonly root: RuntimeEntry<SpawnRuntime>;
	dispose(): Promise<void>;
};

type PromptDetails = {
	readonly id: string;
	readonly visibility: RuntimeVisibility;
};

function userMessage(text: string): UserMessage {
	return {
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

function textContent(message: UserMessage | undefined): string {
	return (message?.content ?? [])
		.flatMap((content) => (content.type === 'text' ? [content.text] : []))
		.join('');
}

function resultText(result: ToolResult | undefined): string {
	if (!result) throw new Error('Expected a tool result');

	return result.content
		.flatMap((content) => (content.type === 'text' ? [content.text] : []))
		.join('');
}

function createIds(...ids: string[]): () => string {
	let index = 0;
	return () => ids[index++] ?? `runtime-${index}`;
}

async function createSpawnScenario(
	options: CreateMockMiniACPOptions,
	observedPrompts: PromptDetails[] = [],
): Promise<SpawnScenario> {
	const mock = createMockMiniACP(options);
	const module = createCoreStateModule(mock.connector);
	const orchestrator = createOrchestrator({
		modules: [module] as const,
		extensions: [
			spawnExtension.extension,
			(api) => {
				api.on('prompt', (_prompt, ctx) => {
					observedPrompts.push(ctx.details);
				});
			},
		],
		createId: createIds('root', 'child'),
	});
	const root = await orchestrator.create();

	return {
		mock,
		root,
		async dispose() {
			await root.runtime.orchestrator.remove(root.details.id);
		},
	};
}

describe('spawnExtension', () => {
	it('requires a display name alongside the child prompt', () => {
		expect(
			spawnExtension.tools.spawn.schema.safeParse({
				name: 'Summary writer',
				prompt: 'write the summary',
			}).success,
		).toBe(true);
		expect(
			spawnExtension.tools.spawn.schema.safeParse({
				prompt: 'write the summary',
			}).success,
		).toBe(false);
		expect(
			spawnExtension.tools.spawn.schema.safeParse({
				name: '',
				prompt: 'write the summary',
			}).success,
		).toBe(false);
		expect(
			spawnExtension.tools.spawn.schema.safeParse({
				name: '   ',
				prompt: 'write the summary',
			}).success,
		).toBe(false);
	});

	it('prompts a hidden child agent without recursive spawn and returns its response as the tool result', async () => {
		const promptDetails: PromptDetails[] = [];
		const scenario = await createSpawnScenario(
			{
				turns: [
					turn([
						toolCalls([
							{
								name: 'spawn',
								arguments: {
									name: 'Summary writer',
									prompt: 'write the summary',
								},
							},
						]),
						turnEnd(),
					]),
					turn([text('summary from child'), turnEnd()]),
				],
			},
			promptDetails,
		);

		try {
			await collect(scenario.root.runtime.prompt(userMessage('parent task')));

			const calls = scenario.mock.calls();
			expect(calls.toolCalls.map((call) => call.name)).toEqual(['spawn']);
			expect(resultText(calls.toolResults[0])).toBe('summary from child');
			expect(calls.toolResults[0]?.isError).toBeUndefined();
			expect(calls.prompts.map(textContent)).toEqual([
				'parent task',
				'write the summary',
			]);
			expect(promptDetails).toEqual([
				{ id: 'root', visibility: 'visible' },
				{ id: 'child', visibility: 'hidden' },
			]);
			expect(calls.setContext[0]?.tools?.map((tool) => tool.name)).toEqual([
				'spawn',
			]);
			expect(calls.setContext[1]?.tools?.map((tool) => tool.name)).toEqual([]);
			expect(
				scenario.root.runtime.orchestrator
					.list()
					.map((entry) => entry.details.id),
			).toEqual(['root']);
			expect(calls.disposes).toBe(1);
		} finally {
			await scenario.dispose();
		}
	});

	it('returns an error tool result when the child turn fails', async () => {
		const scenario = await createSpawnScenario({
			turns: [
				turn([
					toolCalls([
						{
							name: 'spawn',
							arguments: {
								name: 'Worker',
								prompt: 'try work',
							},
						},
					]),
					turnEnd(),
				]),
				turn([
					turnEnd({
						stopCode: StopCode.LlmError,
						stopMessage: 'child failed',
					}),
				]),
			],
		});

		try {
			await collect(scenario.root.runtime.prompt(userMessage('parent task')));

			const result = scenario.mock.calls().toolResults[0];
			expect(result?.isError).toBe(true);
			expect(resultText(result)).toBe('child failed');
			expect(
				scenario.root.runtime.orchestrator
					.list()
					.map((entry) => entry.details.id),
			).toEqual(['root']);
		} finally {
			await scenario.dispose();
		}
	});
});
