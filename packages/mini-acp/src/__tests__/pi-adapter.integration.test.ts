// ---------------------------------------------------------------------------
// Pi Adapter integration test — real LLM call via OpenRouter
//
// Requires OPENROUTER_API_KEY in env or in .env at project root.
// Skips when no key is available.
// Uses the spec-tester fixture DSL against the real Pi agent factory so
// integration coverage exercises the same transport/session path as spec
// confirmation, while still allowing scenario-specific assertions.
// ---------------------------------------------------------------------------

import { expect, it } from 'vitest';
import { StopCode } from '../types/stop-code.js';

import { bindPiAgent } from '../base/pi/agent.js';
import { initialize } from '../spec-tester/actions/initialize.js';
import { prompt } from '../spec-tester/actions/prompt.js';
import { setContext } from '../spec-tester/actions/set-context.js';
import { execute } from '../spec-tester/execute/index.js';
import type {
	Fixture,
	ToolSpec,
	Transcript,
	TranscriptEntry,
} from '../spec-tester/types.js';
import { describeIfKey } from './utils/describe-if-key.js';
import { createValidLLMConfig } from './utils/llm-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function receives<M extends TranscriptEntry['method']>(
	transcript: Transcript,
	method: M,
): Array<Extract<TranscriptEntry, { direction: 'receive'; method: M }>> {
	return transcript.filter(
		(
			entry,
		): entry is Extract<TranscriptEntry, { direction: 'receive'; method: M }> =>
			entry.direction === 'receive' && entry.method === method,
	);
}

function sends<M extends TranscriptEntry['method']>(
	transcript: Transcript,
	method: M,
): Array<Extract<TranscriptEntry, { direction: 'send'; method: M }>> {
	return transcript.filter(
		(
			entry,
		): entry is Extract<TranscriptEntry, { direction: 'send'; method: M }> =>
			entry.direction === 'send' && entry.method === method,
	);
}

function assistantText(transcript: Transcript): string {
	return receives(transcript, 'update')
		.filter((entry) => entry.params.message.role === 'assistant')
		.flatMap((entry) => entry.params.message.content)
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('');
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describeIfKey(
	'OPENROUTER_API_KEY',
	'Pi Adapter — integration (OpenRouter, z-ai/glm-5)',
	(apiKey) => {
		const config = createValidLLMConfig(apiKey, { model: 'z-ai/glm-5' });
		const factory = bindPiAgent;

		it('simple text prompt returns a coherent response', async () => {
			const fixture: Fixture = {
				name: 'integration-simple-text',
				actions: [
					initialize(),
					setContext({
						systemPrompt: 'You are a helpful assistant. Be very brief.',
						config,
					}),
					prompt('What is 2+2? Reply with just the number.'),
				],
			};

			const transcript = await execute(fixture, factory);

			const turnEnds = receives(transcript, 'turnEnd');
			expect(turnEnds).toHaveLength(1);
			expect(turnEnds[0]!.params.stopCode).toBe(StopCode.Finished);

			const chunks = receives(transcript, 'chunk').filter(
				(entry) => entry.params.content.type === 'text',
			);
			expect(chunks.length).toBeGreaterThan(0);

			const updates = receives(transcript, 'update');
			expect(updates).toHaveLength(1);
			expect(assistantText(transcript)).toContain('4');
		}, 30_000);

		it('tool call flow — model calls a tool, gets result, responds', async () => {
			const lookupCapital: ToolSpec = {
				definition: {
					name: 'lookup_capital',
					description:
						'Look up the capital city of a country. Returns JSON with the capital.',
					inputSchema: {
						type: 'object',
						properties: {
							country: {
								type: 'string',
								description: 'The country name',
							},
						},
						required: ['country'],
					},
				},
				handler: (call) => ({
					toolCallId: call.id,
					content: [
						{ type: 'text', text: JSON.stringify({ result: 'Paris' }) },
					],
				}),
			};

			const fixture: Fixture = {
				name: 'integration-tool-call',
				actions: [
					initialize(),
					setContext({
						systemPrompt: 'You are a helpful assistant. Be very brief.',
						tools: [lookupCapital],
						config,
					}),
					prompt(
						'What is the capital of France? Use the lookup_capital tool to find out.',
					),
				],
			};

			const transcript = await execute(fixture, factory);

			const turnEnds = receives(transcript, 'turnEnd');
			expect(turnEnds).toHaveLength(1);
			expect(turnEnds[0]!.params.stopCode).toBe(StopCode.Finished);

			const toolExecutes = receives(transcript, 'toolExecute');
			expect(toolExecutes).toHaveLength(1);
			expect(toolExecutes[0]!.params.call.name).toBe('lookup_capital');

			const toolResults = sends(transcript, 'toolResult');
			expect(toolResults).toHaveLength(1);
			expect(toolResults[0]!.params.toolCallId).toBe(
				toolExecutes[0]!.params.call.id,
			);

			const toolUpdates = receives(transcript, 'update').filter(
				(entry) =>
					entry.params.message.role === 'assistant' &&
					entry.params.message.content.some(
						(block) => block.type === 'toolCall',
					),
			);
			expect(toolUpdates).toHaveLength(0);

			expect(assistantText(transcript).toLowerCase()).toContain('paris');
		}, 60_000);
	},
);
