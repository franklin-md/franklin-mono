import { describe, expect, it } from 'vitest';
import type { Context as PiContext } from '@earendil-works/pi-ai';
import { createPiTestResponse as response } from '../../../../testing/pi-response.js';
import {
	collect,
	StopCode,
	ZERO_USAGE,
	type Message,
} from '@franklin/mini-acp';
import { z } from 'zod';
import { createPiTestConnector } from '../../../../testing/pi-connector.js';
import { createRuntime } from '../../../../testing/create-runtime.js';
import { createCoreStateModule } from '../../module/index.js';
import { emptyCoreState } from '../../state.js';
import { createMessageEntries } from '../../history/create.js';
import { franklinSessionCodec } from '../../../../app/session/codecs/index.js';

const prompt = {
	role: 'user',
	content: [{ type: 'text', text: 'Continue the task' }],
} satisfies Message;
const config = {
	provider: 'openai-codex',
	model: 'gpt-5.4',
	apiKey: 'test-only',
};

describe('compaction through the real Pi loop and RPC transport', () => {
	it('compacts before inference, keeps history, restores and forks the compacted context', async () => {
		const requests: PiContext[] = [];
		const connector = createPiTestConnector(
			{
				streamFn: (model, context) => {
					requests.push({
						...context,
						messages: structuredClone(context.messages),
					});
					return response(model, [
						{
							type: 'text',
							text: context.systemPrompt?.startsWith('Summarize')
								? 'Remember the original task.'
								: 'done',
						},
					]);
				},
			},
			2048,
		);
		const module = createCoreStateModule(connector);
		const state = emptyCoreState();
		state.core.entries = createMessageEntries([
			{
				role: 'user',
				content: [{ type: 'text', text: 'original '.repeat(1600) }],
			},
			{ role: 'assistant', content: [{ type: 'text', text: 'accepted' }] },
		]);
		const runtime = await createRuntime(module, state, []);
		await runtime.setLLMConfig(config);
		try {
			const result = await collect(runtime.prompt(prompt));
			expect(result.turnEnd?.stopCode).toBe(StopCode.Finished);
			expect(
				requests.filter((request) =>
					request.systemPrompt?.startsWith('Summarize'),
				),
			).toHaveLength(5);
			const main = requests.at(-1)!;
			expect(JSON.stringify(main.messages)).toContain(
				'Remember the original task.',
			);
			expect(JSON.stringify(main.messages)).not.toContain('original original');
			expect(main.messages.at(-1)?.content).toEqual(prompt.content);
			const snapshot = runtime.getSession();
			expect(snapshot.entries[0]).toEqual(state.core.entries[0]);
			expect(
				snapshot.entries.filter((entry) => entry.type === 'compaction'),
			).toHaveLength(1);
			expect(snapshot.llmConfig).not.toHaveProperty('apiKey');
			expect(snapshot.usage.tokens.total).toBe(90);
			const fork = await module.state(runtime).fork();
			expect(fork.core.entries).toEqual(snapshot.entries);
			expect(fork.core.usage).toEqual(ZERO_USAGE);
			const child = await module.state(runtime).child();
			expect(child.core.entries).toEqual([]);
			const restored = await createRuntime(module, fork, []);
			try {
				await restored.setLLMConfig(config);
				await collect(restored.prompt(prompt));
				expect(JSON.stringify(requests.at(-1)?.messages)).toContain(
					'Remember the original task.',
				);
			} finally {
				await restored.dispose();
			}
			// The app codec round-trip preserves the checkpoint, including its boundary.
			const session = {
				core: snapshot,
				details: { visibility: 'visible' as const },
				store: {},
				env: {
					fsConfig: {
						cwd: '/tmp',
						permissions: {
							allowRead: [],
							denyRead: [],
							allowWrite: [],
							denyWrite: [],
						},
					},
					netConfig: { allowedDomains: [], deniedDomains: [] },
				},
			};
			expect(
				franklinSessionCodec.decode({ version: 3, data: session }),
			).toMatchObject({ ok: true, value: { core: snapshot } });
		} finally {
			await runtime.dispose();
		}
	});

	it('compacts inside a tool loop after recording assistant updates and preserves the latest tool exchange', async () => {
		let calls = 0;
		let summaries = 0;
		const mainRequests: PiContext[] = [];
		const summaryInputs: string[] = [];
		const connector = createPiTestConnector(
			{
				streamFn: (model, context) => {
					if (context.systemPrompt?.startsWith('Summarize')) {
						summaries += 1;
						summaryInputs.push(JSON.stringify(context.messages));
						return response(model, [
							{ type: 'text', text: 'The earlier lookup succeeded.' },
						]);
					}
					mainRequests.push({
						...context,
						messages: structuredClone(context.messages),
					});
					calls += 1;
					return calls <= 2
						? response(
								model,
								[
									{ type: 'text', text: 'intermediate progress' },
									{
										type: 'toolCall',
										id: `call-${calls}`,
										name: 'lookup',
										arguments: {},
									},
								],
								'toolUse',
							)
						: response(model, [{ type: 'text', text: 'done' }]);
				},
			},
			2048,
		);
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			emptyCoreState(),
			[
				(api) => {
					api.registerTool(
						{
							name: 'lookup',
							description: 'Look up information',
							schema: z.object({}),
						},
						{ execute: () => 'result '.repeat(500) },
					);
				},
			],
		);
		await runtime.setLLMConfig(config);
		try {
			const result = await collect(runtime.prompt(prompt));
			expect(result.turnEnd?.stopCode).toBe(StopCode.Finished);
			expect(calls).toBe(3);
			expect(summaries).toBeGreaterThan(0);
			expect(summaryInputs.join('')).toContain('intermediate progress');
			expect(runtime.getSession().usage.tokens.total).toBe(
				(calls + summaries) * 15,
			);
			const last = mainRequests.at(-1)!;
			expect(JSON.stringify(last.messages)).toContain(
				'The earlier lookup succeeded.',
			);
			expect(
				last.messages.some(
					(message) =>
						message.role === 'toolResult' && message.toolCallId === 'call-2',
				),
			).toBe(true);
			expect(
				last.messages.some(
					(message) =>
						message.role === 'toolResult' && message.toolCallId === 'call-1',
				),
			).toBe(false);
			expect(
				runtime
					.getSession()
					.entries.some(
						(entry) =>
							entry.type === 'message' &&
							entry.message.role === 'toolResult' &&
							entry.message.toolCallId === 'call-1',
					),
			).toBe(true);
		} finally {
			await runtime.dispose();
		}
	});

	it('exposes manual compaction and emits a persistence notification', async () => {
		const connector = createPiTestConnector(
			{
				streamFn: (model) =>
					response(model, [{ type: 'text', text: 'A compact summary.' }]),
			},
			8192,
		);
		const state = emptyCoreState();
		state.core.entries = createMessageEntries([
			{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(90_000) }] },
			prompt,
		]);
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			state,
			[],
		);
		await runtime.setLLMConfig(config);
		const events: string[] = [];
		runtime.coreEvents.subscribe((event) => events.push(event.type));
		try {
			await expect(runtime.compact()).resolves.toBe(true);
			expect(events).toEqual(['compaction-settled']);
			expect(runtime.getSession().entries).toHaveLength(3);
			await expect(runtime.compact()).resolves.toBe(false);
		} finally {
			await runtime.dispose();
		}
	});
});
