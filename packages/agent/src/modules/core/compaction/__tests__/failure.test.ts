import { z } from 'zod';
import type { MiniACPConnector } from '@franklin/mini-acp';
import { RuntimeStopCode } from '../../turn/runtime-stop-code.js';
import { combineAll } from '../../../state/index.js';
import { createStoreStateModule } from '../../../store/state-module.js';
import { StoreRegistry } from '../../../store/api/registry/index.js';
import { conversationExtension } from '../../../../extensions/conversation/bundle.js';
import { statusExtension } from '../../../../extensions/status/extension.js';
import { statusKey } from '../../../../extensions/status/key.js';
import { describe, expect, it } from 'vitest';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { StopCode } from '@franklin/mini-acp';
import { collectPrompt } from '../../turn/collect.js';
import { createPiTestConnector } from '../../../../testing/pi-connector.js';
import { createPiTestResponse } from '../../../../testing/pi-response.js';
import { createRuntime } from '../../../../testing/create-runtime.js';
import { createCoreStateModule } from '../../module/index.js';
import { emptyCoreState } from '../../state.js';
import { createMessageEntries } from '../../../../testing/session-entries.js';

const config = {
	provider: 'openai-codex',
	model: 'gpt-5.4',
	apiKey: 'test-only',
};
const prompt = {
	role: 'user' as const,
	content: [{ type: 'text' as const, text: 'continue' }],
};

async function setup(connector: MiniACPConnector, state = emptyCoreState()) {
	const module = combineAll([
		createCoreStateModule(connector),
		createStoreStateModule(new StoreRegistry()),
	] as const);
	return createRuntime(module, { ...module.emptyState(), ...state }, [
		conversationExtension.extension,
		statusExtension(),
		(api) =>
			api.registerTool(
				{ name: 'lookup', description: 'Lookup', schema: z.object({}) },
				{ execute: () => 'result '.repeat(4000) },
			),
	]);
}

function expectSettled(
	runtime: Awaited<ReturnType<typeof setup>>,
	code: number,
) {
	expect(runtime.getStore(statusKey).get()).toBe('unread');
	const turns = runtime.getStore(conversationExtension.keys.conversation).get();
	const blocks = turns.at(-1)!.response.blocks;
	expect(blocks.filter((block) => block.kind === 'turnEnd')).toHaveLength(1);
	expect(blocks.at(-1)).toMatchObject({ kind: 'turnEnd', stopCode: code });
	expect(blocks.every((block) => block.endedAt !== undefined)).toBe(true);
}

describe('compaction failures through Pi and RPC', () => {
	it.each(['before', 'after'])(
		'cancels summarization %s initial inference and settles observers',
		async (boundary) => {
			let announce = () => {};
			const started = new Promise<void>((resolve) => {
				announce = resolve;
			});
			let requests = 0;
			let cancelled = false;
			const connector = createPiTestConnector({
				streamFn: (model, context, options) => {
					requests += 1;
					if (cancelled)
						return createPiTestResponse(model, [
							{
								type: 'text',
								text: context.systemPrompt?.startsWith('Summarize')
									? 'Summary.'
									: 'done',
							},
						]);
					if (!context.systemPrompt?.startsWith('Summarize'))
						return createPiTestResponse(
							model,
							[
								{
									type: 'toolCall',
									id: 'lookup-1',
									name: 'lookup',
									arguments: {},
								},
							],
							'toolUse',
						);
					const stream = createAssistantMessageEventStream();
					options?.signal?.addEventListener(
						'abort',
						() => {
							cancelled = true;
							void createPiTestResponse(model, [])
								.result()
								.then((message) => {
									message.stopReason = 'aborted';
									stream.push({
										type: 'error',
										reason: 'aborted',
										error: message,
									});
								});
						},
						{ once: true },
					);
					announce();
					return stream;
				},
			});
			const state = emptyCoreState();
			if (boundary === 'before')
				state.core.entries = createMessageEntries([
					{
						role: 'user',
						content: [{ type: 'text', text: 'x'.repeat(32_000) }],
					},
				]);
			const runtime = await setup(connector, state);
			await runtime.setLLMConfig(config);
			try {
				const pending = collectPrompt(runtime.prompt(prompt));

				await started;
				await runtime.cancel();
				const result = await pending;
				expect(result.turnEnd?.stopCode).toBe(StopCode.Cancelled);
				expect(result.turnEnd?.usage.tokens.total).toBe(
					boundary === 'after' ? 15 : 0,
				);
				expectSettled(runtime, StopCode.Cancelled);
				expect(requests).toBe(boundary === 'after' ? 2 : 1);
				expect(
					runtime
						.getSession()
						.entries.some((entry) => entry.type === 'compaction'),
				).toBe(false);
				const retry = await collectPrompt(runtime.prompt(prompt));
				expect(retry.turnEnd?.stopCode).toBe(StopCode.Finished);
			} finally {
				await runtime.dispose();
			}
		},
	);

	it('stops on summary failure without appending a checkpoint or starting main inference', async () => {
		let attempts = 0;
		const connector = createPiTestConnector({
			streamFn: () => {
				attempts += 1;
				throw new Error('provider failed');
			},
		});
		const state = emptyCoreState();
		state.core.entries = createMessageEntries([
			{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(32_000) }] },
		]);
		const runtime = await setup(connector, state);
		await runtime.setLLMConfig(config);
		try {
			const result = await collectPrompt(runtime.prompt(prompt));
			expect(result.turnEnd).toMatchObject({
				stopCode: RuntimeStopCode.CompactionFailure,
				stopMessage: 'Compaction summary failed',
			});
			expect(attempts).toBe(1);
			expectSettled(runtime, RuntimeStopCode.CompactionFailure);
			expect(
				runtime
					.getSession()
					.entries.some((entry) => entry.type === 'compaction'),
			).toBe(false);
		} finally {
			await runtime.dispose();
		}
	});

	it('cancels the paused raw turn, preserves usage and allows reentrant retry after summary failure', async () => {
		let mainCalls = 0;
		let summaries = 0;
		const connector = createPiTestConnector({
			streamFn: (model, context) => {
				if (context.systemPrompt?.startsWith('Summarize')) {
					if (++summaries === 1) throw new Error('summary failed');
					return createPiTestResponse(model, [
						{ type: 'text', text: 'Lookup completed.' },
					]);
				}
				mainCalls += 1;
				return mainCalls === 1
					? createPiTestResponse(
							model,
							[
								{
									type: 'toolCall',
									id: 'lookup-1',
									name: 'lookup',
									arguments: {},
								},
							],
							'toolUse',
						)
					: createPiTestResponse(model, [{ type: 'text', text: 'recovered' }]);
			},
		});
		const runtime = await setup(connector);
		await runtime.setLLMConfig(config);
		let terminals = 0;
		try {
			for await (const event of runtime.prompt(prompt)) {
				if (event.type !== 'turnEnd') continue;
				terminals += 1;
				expect(event.stopCode).toBe(RuntimeStopCode.CompactionFailure);
				expect(event.usage.tokens.total).toBe(15);
				expect(event.stepUsage.tokens.total).toBe(0);
				expect(runtime.getSession().usage.tokens.total).toBe(15);
				expect(mainCalls).toBe(1);
				expect(
					runtime
						.getSession()
						.entries.some((entry) => entry.type === 'compaction'),
				).toBe(false);
				expectSettled(runtime, RuntimeStopCode.CompactionFailure);
				const result = await collectPrompt(runtime.prompt(prompt));
				expect(result.turnEnd?.stopCode).toBe(StopCode.Finished);
			}
			expect(terminals).toBe(1);
			expect(mainCalls).toBe(2);
			expect(runtime.getSession().usage.tokens.total).toBe(
				(mainCalls + summaries - 1) * 15,
			);
			expect(
				runtime
					.getSession()
					.entries.some(
						(entry) =>
							entry.type === 'message' && entry.message.role === 'toolResult',
					),
			).toBe(true);
			expectSettled(runtime, StopCode.Finished);
		} finally {
			await runtime.dispose();
		}
	});
});
