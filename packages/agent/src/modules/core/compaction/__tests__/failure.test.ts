import { describe, expect, it } from 'vitest';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { collect } from '@franklin/mini-acp';
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

describe('compaction failures through Pi and RPC', () => {
	it('cancels an in-flight summary without committing it or starting main inference', async () => {
		let announce = () => {};
		const started = new Promise<void>((resolve) => {
			announce = resolve;
		});
		let requests = 0;
		const connector = createPiTestConnector({
			streamFn: (model, _context, options) => {
				requests += 1;
				const stream = createAssistantMessageEventStream();
				options?.signal?.addEventListener(
					'abort',
					() => {
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
		state.core.entries = createMessageEntries([
			{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(32_000) }] },
		]);
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			state,
			[],
		);
		await runtime.setLLMConfig(config);
		try {
			const pending = collect(runtime.prompt(prompt));
			const cancelled = pending.then(
				() => false,
				() => true,
			);
			await started;
			await runtime.cancel();
			expect(await cancelled).toBe(true);
			expect(requests).toBe(1);
			expect(
				runtime
					.getSession()
					.entries.some((entry) => entry.type === 'compaction'),
			).toBe(false);
		} finally {
			await runtime.dispose();
		}
	});

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
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			state,
			[],
		);
		await runtime.setLLMConfig(config);
		try {
			await expect(collect(runtime.prompt(prompt))).rejects.toThrow(
				'Compaction summary failed',
			);
			expect(attempts).toBe(1);
			expect(
				runtime
					.getSession()
					.entries.some((entry) => entry.type === 'compaction'),
			).toBe(false);
		} finally {
			await runtime.dispose();
		}
	});
});
