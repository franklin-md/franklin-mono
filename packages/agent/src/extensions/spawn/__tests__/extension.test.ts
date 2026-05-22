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
	RuntimeCollection,
	type OrchestratorRuntime,
} from '../../../modules/orchestrator/index.js';
import type { CoreStateModule } from '../../../modules/core/module.js';
import { spawnExtension } from '../index.js';

type SpawnRuntime = OrchestratorRuntime<CoreStateModule>;

type SpawnScenario = {
	readonly mock: MockMiniACP;
	readonly root: { readonly id: string; readonly runtime: SpawnRuntime };
	readonly collection: RuntimeCollection<SpawnRuntime>;
	dispose(): Promise<void>;
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
): Promise<SpawnScenario> {
	const mock = createMockMiniACP(options);
	const module = createCoreStateModule(mock.connector);
	const collection = new RuntimeCollection<SpawnRuntime>();
	const orchestrator = createOrchestrator({
		modules: [module] as const,
		collection,
		extensions: [spawnExtension.extension],
		createId: createIds('root', 'child'),
	});
	const root = await orchestrator.create();

	return {
		mock,
		root,
		collection,
		async dispose() {
			await root.runtime.orchestrator.remove(root.id);
		},
	};
}

describe('spawnExtension', () => {
	it('prompts a child agent and returns the child response as the tool result', async () => {
		const scenario = await createSpawnScenario({
			turns: [
				turn([
					toolCalls([
						{ name: 'spawn', arguments: { prompt: 'write the summary' } },
					]),
					turnEnd(),
				]),
				turn([text('summary from child'), turnEnd()]),
			],
		});

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
			expect(scenario.collection.list().map((entry) => entry.id)).toEqual([
				'root',
			]);
			expect(calls.disposes).toBe(1);
		} finally {
			await scenario.dispose();
		}
	});

	it('returns an error tool result when the child turn fails', async () => {
		const scenario = await createSpawnScenario({
			turns: [
				turn([
					toolCalls([{ name: 'spawn', arguments: { prompt: 'try work' } }]),
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
			expect(scenario.collection.list().map((entry) => entry.id)).toEqual([
				'root',
			]);
		} finally {
			await scenario.dispose();
		}
	});
});
