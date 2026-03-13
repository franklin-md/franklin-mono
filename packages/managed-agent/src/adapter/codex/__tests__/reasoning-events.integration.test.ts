import { afterEach, describe, expect, it } from 'vitest';

import {
	createCodexAdapterHarness,
	getRealCodexIntegrationAvailability,
} from './test-harness.js';

const realCodex = getRealCodexIntegrationAvailability();
const describeRealCodex = realCodex.available ? describe : describe.skip;

describeRealCodex('Reasoning events (real Codex)', () => {
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

	it('captures reasoning events from a reasoning model', async () => {
		const harness = createHarness();

		await harness.startSession({}, 10_000);
		await harness.waitForThreadId(10_000);

		await harness.startTurn(
			'What is 7 * 13? Think step by step. Reply with just the number.',
		);
		await harness.waitForEvent('turn.completed', 1, 120_000);

		// Log all events for diagnostic purposes
		console.log('\n--- All captured events ---');
		for (const event of harness.events) {
			console.log(JSON.stringify(event));
		}
		console.log('--- End events ---\n');

		// Check for reasoning events
		const reasoningStarted = harness.events.filter(
			(e) => e.type === 'item.started' && e.item.kind === 'reasoning',
		);
		const reasoningDeltas = harness.events.filter(
			(e) => e.type === 'item.delta' && e.item.kind === 'reasoning',
		);
		const reasoningCompleted = harness.events.filter(
			(e) => e.type === 'item.completed' && e.item.kind === 'reasoning',
		);

		console.log(
			`Reasoning events: ${reasoningStarted.length} started, ${reasoningDeltas.length} deltas, ${reasoningCompleted.length} completed`,
		);

		// Verify the assistant still produces a final answer
		const assistantCompletion = harness.events.findLast(
			(event) =>
				event.type === 'item.completed' &&
				event.item.kind === 'assistant_message' &&
				event.item.text.trim().length > 0,
		);
		expect(assistantCompletion).toBeDefined();
	}, 120_000);
});
