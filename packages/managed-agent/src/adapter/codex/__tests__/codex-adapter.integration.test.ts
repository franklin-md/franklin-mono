import { afterEach, describe, expect, it } from 'vitest';

import {
	createCodexAdapterHarness,
	getRealCodexIntegrationAvailability,
} from './test-harness.js';

const realCodex = getRealCodexIntegrationAvailability();
const describeRealCodex = realCodex.available ? describe : describe.skip;

describeRealCodex('CodexAdapter integration', () => {
	const harnesses: Array<{ dispose(): Promise<void> }> = [];

	function createHarness(
		options?: Parameters<typeof createCodexAdapterHarness>[0],
	) {
		const harness = createCodexAdapterHarness(options);
		harnesses.push(harness);
		return harness;
	}

	afterEach(async () => {
		while (harnesses.length > 0) {
			const harness = harnesses.pop();
			if (harness) {
				await harness.dispose();
			}
		}
	});

	it('starts a real codex session, completes one turn, and resumes the thread', async () => {
		const started = createHarness();

		await started.startSession({}, 10_000);
		const threadId = await started.waitForThreadId(10_000);

		await started.startTurn(
			'Reply with a single short sentence. Do not use tools, commands, or markdown.',
		);
		await started.waitForEvent('turn.completed', 1, 120_000);

		const assistantCompletion = started.events.findLast(
			(event) =>
				event.type === 'item.completed' &&
				event.item.kind === 'assistant_message' &&
				event.item.text.trim().length > 0,
		);
		expect(assistantCompletion).toBeDefined();

		await started.dispose();
		harnesses.pop();

		const resumed = createHarness({ threadId });
		await resumed.resumeSession({}, 10_000);

		expect(await resumed.waitForThreadId(10_000)).toBe(threadId);
	}, 120_000);
});
