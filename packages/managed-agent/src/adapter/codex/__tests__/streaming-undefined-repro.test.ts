import { afterEach, describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '../../../messages/event.js';
import {
	createCodexAdapterHarness,
	createScriptedCodexAdapterHarness,
	getRealCodexIntegrationAvailability,
} from './test-harness.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all item.delta events from a collected event list. */
function getDeltaEvents(events: ManagedAgentEvent[]) {
	return events.filter(
		(e): e is Extract<ManagedAgentEvent, { type: 'item.delta' }> =>
			e.type === 'item.delta',
	);
}

/**
 * Accumulate textDelta values from item.delta events, simulating what the TUI
 * does when building streaming text. If any textDelta is undefined, string
 * concatenation will produce the literal "undefined".
 */
function accumulateText(events: ManagedAgentEvent[]): string {
	let text = '';
	for (const e of getDeltaEvents(events)) {
		// Intentionally use string concatenation to mirror the TUI bug:
		// '' + undefined === 'undefined'
		const td = (e.item as { textDelta: string | undefined }).textDelta;
		text = text + String(td);
	}
	return text;
}

// ---------------------------------------------------------------------------
// Real Codex integration tests
// ---------------------------------------------------------------------------

const realCodex = getRealCodexIntegrationAvailability();
const describeRealCodex = realCodex.available ? describe : describe.skip;

describeRealCodex('Streaming undefined repro — real Codex API', () => {
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

	it('captures delta events from a tool-use prompt and checks for undefined textDelta', async () => {
		const harness = createHarness();

		await harness.startSession({}, 10_000);
		await harness.startTurn(
			'What files are in the current directory? List them.',
		);
		await harness.waitForEvent('turn.completed', 1, 120_000);

		const deltas = getDeltaEvents(harness.events);

		// Log all delta events for diagnostic visibility
		console.log(`\n--- Captured ${deltas.length} item.delta events ---`);
		for (const d of deltas) {
			const td = (d.item as { textDelta: string | undefined }).textDelta;
			console.log(
				JSON.stringify({
					kind: d.item.kind,
					textDelta: td,
					textDeltaType: typeof td,
				}),
			);
		}

		// Check: are there any deltas with undefined textDelta?
		const undefinedDeltas = deltas.filter(
			(d) =>
				(d.item as { textDelta: string | undefined }).textDelta === undefined,
		);
		console.log(
			`\nDeltas with undefined textDelta: ${undefinedDeltas.length}/${deltas.length}`,
		);

		// Accumulate text the way the TUI does and check for literal "undefined"
		const accumulated = accumulateText(harness.events);
		console.log(
			`\nAccumulated text preview: ${JSON.stringify(accumulated.slice(0, 200))}`,
		);

		// Log whether bug was triggered so we can see it in test output
		const bugTriggered = undefinedDeltas.length > 0;
		console.log(
			bugTriggered
				? '\n*** BUG TRIGGERED: undefined textDelta found in real Codex deltas ***'
				: '\nNo undefined textDelta found with this prompt.',
		);
		console.log(
			`Accumulated text contains "undefined": ${accumulated.includes('undefined')}`,
		);
	}, 120_000);

	it('control: simple text-only prompt produces no undefined textDelta', async () => {
		const harness = createHarness();

		await harness.startSession({}, 10_000);
		await harness.startTurn('Reply with exactly: Hello world');
		await harness.waitForEvent('turn.completed', 1, 120_000);

		const deltas = getDeltaEvents(harness.events);

		console.log(
			`\n--- Control: Captured ${deltas.length} item.delta events ---`,
		);
		for (const d of deltas) {
			const td = (d.item as { textDelta: string | undefined }).textDelta;
			console.log(
				JSON.stringify({
					kind: d.item.kind,
					textDelta: td,
					textDeltaType: typeof td,
				}),
			);
		}

		const undefinedDeltas = deltas.filter(
			(d) =>
				(d.item as { textDelta: string | undefined }).textDelta === undefined,
		);

		// Control test: a text-only prompt should never produce undefined deltas
		expect(undefinedDeltas).toHaveLength(0);

		const accumulated = accumulateText(harness.events);
		expect(accumulated).not.toContain('undefined');
	}, 120_000);
});

// ---------------------------------------------------------------------------
// Scripted mock test — runs in normal CI, no API key needed
// ---------------------------------------------------------------------------

/**
 * Mock Codex server that sends an item/agentMessage/delta with NO text field
 * in the delta object, simulating the suspected bug trigger (e.g. a tool-use
 * or thinking delta).
 */
const MOCK_SERVER_WITH_EMPTY_DELTA = `
const rl = require('readline').createInterface({ input: process.stdin });

rl.on('line', (line) => {
	const msg = JSON.parse(line);

	if (msg.id && msg.result && !msg.method) return;

	switch (msg.method) {
		case 'initialize': {
			respond(msg.id, { ok: true });
			break;
		}
		case 'thread/start': {
			const threadId = 'thread-1';
			respond(msg.id, { threadId });
			notify('thread/started', { thread: { id: threadId } });
			break;
		}
		case 'turn/start': {
			respond(msg.id, { ok: true });
			notify('turn/started', { turn: { id: 'turn-1' } });

			// Start an agent message
			notify('item/started', { item: { type: 'agentMessage', id: 'msg-1', text: '' } });

			// Normal text delta
			notify('item/agentMessage/delta', { item: { id: 'msg-1' }, delta: { text: 'Hello ' } });

			// Delta with NO text field — simulates tool-use/thinking delta
			notify('item/agentMessage/delta', { item: { id: 'msg-1' }, delta: {} });

			// Another normal text delta
			notify('item/agentMessage/delta', { item: { id: 'msg-1' }, delta: { text: 'world' } });

			// Complete the item and turn
			notify('item/completed', { item: { type: 'agentMessage', id: 'msg-1', text: 'Hello world' } });
			notify('turn/completed', { turn: { id: 'turn-1' } });
			break;
		}
		default: {
			respond(msg.id, null);
		}
	}
});

function respond(id, result) {
	process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\\n');
}

function notify(method, params) {
	process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\\n');
}
`;

describe('Streaming undefined repro — scripted mock', () => {
	let harness: ReturnType<typeof createScriptedCodexAdapterHarness> | null =
		null;

	afterEach(async () => {
		if (harness) {
			await harness.adapter.dispose();
			harness = null;
		}
	});

	it('delta with missing text field falls back to empty string (bug fix)', async () => {
		harness = createScriptedCodexAdapterHarness(MOCK_SERVER_WITH_EMPTY_DELTA);

		await harness.startSession();
		await harness.startTurn('test');
		await harness.waitForEvent('turn.completed', 1);

		const deltas = getDeltaEvents(harness.events);
		expect(deltas).toHaveLength(3);

		// The second delta should now fall back to '' instead of undefined
		const secondDelta = deltas[1]!;
		const textDelta = (secondDelta.item as { textDelta: string | undefined })
			.textDelta;
		expect(textDelta).toBe('');

		// Accumulated text should NOT contain the literal "undefined"
		const accumulated = accumulateText(harness.events);
		expect(accumulated).toBe('Hello world');
	});
});
