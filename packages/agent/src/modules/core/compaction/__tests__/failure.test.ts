import { describe, expect, it } from 'vitest';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { collect, StopCode } from '@franklin/mini-acp';
import { createPiTestConnector } from '../../../../testing/pi-connector.js';
import { createPiTestResponse } from '../../../../testing/pi-response.js';
import { createRuntime } from '../../../../testing/create-runtime.js';
import { createCoreStateModule } from '../../module/index.js';
import { emptyCoreState } from '../../state.js';
import { createMessageEntries } from '../../history/create.js';

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
		const connector = createPiTestConnector(
			{
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
			},
			2048,
		);
		const state = emptyCoreState();
		state.core.entries = createMessageEntries([
			{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(12_000) }] },
		]);
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			state,
			[],
		);
		await runtime.setLLMConfig(config);
		try {
			const pending = collect(runtime.prompt(prompt));
			await started;
			await runtime.cancel();
			const result = await pending;
			expect(result.turnEnd?.stopCode).toBe(StopCode.Cancelled);
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
		const connector = createPiTestConnector(
			{
				streamFn: () => {
					attempts += 1;
					throw new Error('provider failed');
				},
			},
			2048,
		);
		const state = emptyCoreState();
		state.core.entries = createMessageEntries([
			{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(12_000) }] },
		]);
		const runtime = await createRuntime(
			createCoreStateModule(connector),
			state,
			[],
		);
		await runtime.setLLMConfig(config);
		try {
			const result = await collect(runtime.prompt(prompt));
			expect(result.turnEnd?.stopCode).toBe(StopCode.LlmError);
			expect(result.turnEnd?.stopMessage).toBe('Compaction summary failed');
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
