import { expect, it } from 'vitest';
import { createPiAgent } from '../../base/pi/agent.js';
import type { MiniACPAgent } from '../../protocol/index.js';
import { initialize } from '../../spec-tester/actions/initialize.js';
import { prompt } from '../../spec-tester/actions/prompt.js';
import { setContext } from '../../spec-tester/actions/set-context.js';
import { execute } from '../../spec-tester/execute/index.js';
import type { Fixture, ToolSpec } from '../../spec-tester/types.js';
import type { LLMConfig } from '../../types/context.js';
import { StopCode } from '../../types/stop-code.js';
import { assistantText, receives, sends } from './transcript.js';

const factory = (server: MiniACPAgent) => createPiAgent(server);

export type SimpleTextPromptProbe = {
	name: string;
	fixtureName: string;
	config: LLMConfig;
	systemPrompt: string;
	promptText: string;
	expectedText: RegExp;
	timeoutMs: number;
};

export function itCompletesSimpleTextPrompt(
	probe: SimpleTextPromptProbe,
): void {
	it(
		probe.name,
		async () => {
			const fixture: Fixture = {
				name: probe.fixtureName,
				actions: [
					initialize(),
					setContext({
						systemPrompt: probe.systemPrompt,
						config: probe.config,
					}),
					prompt(probe.promptText),
				],
			};

			const transcript = await execute(fixture, factory);

			const turnEnds = receives(transcript, 'turnEnd');
			expect(turnEnds).toHaveLength(1);
			expect(turnEnds[0]?.params.stopCode).toBe(StopCode.Finished);

			const chunks = receives(transcript, 'chunk').filter(
				(entry) => entry.params.content.type === 'text',
			);
			expect(chunks.length).toBeGreaterThan(0);

			const updates = receives(transcript, 'update');
			expect(updates).toHaveLength(1);
			expect(assistantText(transcript)).toMatch(probe.expectedText);
		},
		probe.timeoutMs,
	);
}

export type LookupCapitalToolProbe = {
	config: LLMConfig;
	timeoutMs: number;
};

export function itCompletesLookupCapitalToolCall(
	probe: LookupCapitalToolProbe,
): void {
	it(
		'tool call flow — model calls a tool, gets result, responds',
		async () => {
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
						config: probe.config,
					}),
					prompt(
						'What is the capital of France? Use the lookup_capital tool to find out.',
					),
				],
			};

			const transcript = await execute(fixture, factory);

			const turnEnds = receives(transcript, 'turnEnd');
			expect(turnEnds).toHaveLength(1);
			expect(turnEnds[0]?.params.stopCode).toBe(StopCode.Finished);

			const toolExecutes = receives(transcript, 'toolExecute');
			expect(toolExecutes).toHaveLength(1);
			expect(toolExecutes[0]?.params.call.name).toBe('lookup_capital');

			const toolResults = sends(transcript, 'toolResult');
			expect(toolResults).toHaveLength(1);
			expect(toolResults[0]?.params.toolCallId).toBe(
				toolExecutes[0]?.params.call.id,
			);

			const toolUpdates = receives(transcript, 'update').filter(
				(entry) =>
					entry.params.message.role === 'assistant' &&
					entry.params.message.content.some(
						(block) => block.type === 'toolCall',
					),
			);
			expect(toolUpdates).toHaveLength(0);

			expect(assistantText(transcript)).toMatch(/paris/i);
		},
		probe.timeoutMs,
	);
}
