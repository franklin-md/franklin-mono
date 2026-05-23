import type { StreamEvent } from '@franklin/mini-acp';
import { wait } from '@franklin/lib';
import {
	createMockMiniACP,
	textChunkStream,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';

import { combineAll } from '../../modules/state/index.js';
import { createRuntime } from '../../testing/index.js';
import { createCoreStateModule } from '../../modules/core/module/index.js';
import { StoreRegistry } from '../../modules/store/api/registry/index.js';
import { createStoreStateModule } from '../../modules/store/state-module.js';
import { conversationExtension } from '../conversation/bundle.js';
import type { ConversationTurn } from '../conversation/types.js';

const TOKEN_INTERVAL_MS = 5;
const CHUNK_COUNT = 100;
const TOKEN_TEXT = 'x'.repeat(CHUNK_COUNT);
const BLOCKER = new Int32Array(new SharedArrayBuffer(4));

function blockFor(ms: number): void {
	if (ms <= 0) return;
	Atomics.wait(BLOCKER, 0, 0, Math.ceil(ms));
}

function pacedTurn() {
	return turn([
		textChunkStream(TOKEN_TEXT, {
			tokenizer: (text) => text.split(''),
			delayMs: (_chunk, index) => index * TOKEN_INTERVAL_MS,
			delayMode: 'elapsed',
		}),
		turnEnd(),
	]);
}

async function collect(iterable: AsyncIterable<StreamEvent>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the prompt stream.
	}
}

async function createConversationRuntime() {
	const mock = createMockMiniACP({ defaultTurn: pacedTurn() });
	const module = combineAll([
		createCoreStateModule(mock.connector),
		createStoreStateModule(new StoreRegistry()),
	] as const);
	const runtime = await createRuntime(module, module.emptyState(), [
		conversationExtension.extension,
	]);
	return runtime;
}

function assistantTextLength(turns: readonly ConversationTurn[]): number {
	const latestBlock = turns.at(-1)?.response.blocks[0];
	return latestBlock?.kind === 'text' ? latestBlock.text.length : 0;
}

async function collectPaintSamples(input: {
	readonly isPromptDone: () => boolean;
	readonly getTurns: () => readonly ConversationTurn[];
}): Promise<number[]> {
	const samples: number[] = [];
	while (!input.isPromptDone()) {
		await wait(0);
		if (!input.isPromptDone()) {
			samples.push(assistantTextLength(input.getTurns()));
		}
	}
	return samples;
}

async function expectPartialResponseVisibleFromMacrotask(
	subscriberWorkMs: number,
): Promise<void> {
	const runtime = await createConversationRuntime();
	const store = runtime.getStore(conversationExtension.keys.conversation);
	let promptDone = false;

	store.subscribe(() => {
		blockFor(subscriberWorkMs);
	});

	try {
		const paintSamples = collectPaintSamples({
			isPromptDone: () => promptDone,
			getTurns: () => store.get(),
		});
		const promptDrained = collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		).finally(() => {
			promptDone = true;
		});

		await promptDrained;
		const samples = await paintSamples;
		const partialSamples = samples.filter(
			(textLength) => textLength > 0 && textLength < CHUNK_COUNT,
		);
		expect(partialSamples.length).toBeGreaterThan(0);
	} finally {
		await runtime.dispose();
	}
}

describe('conversationExtension event loop integration', () => {
	it.each([
		['sync subscriber work stays below the token interval', 1],
	] as const)(
		'makes partial assistant text visible from a macrotask when %s',
		async (_description, subscriberWorkMs) => {
			await expectPartialResponseVisibleFromMacrotask(subscriberWorkMs);
		},
	);

	// This remains a real failure mode for raw store subscribers. The chosen
	// solution is to keep raw subscribers cheap and throttle expensive React
	// subscribers at the adapter layer.
	// eslint-disable-next-line vitest/no-disabled-tests
	it.skip('makes partial assistant text visible from a macrotask when sync subscriber work exceeds the token interval', async () => {
		await expectPartialResponseVisibleFromMacrotask(TOKEN_INTERVAL_MS + 3);
	});
});
