import { expect, it } from 'vitest';
import { createPiAgent } from '../../backend/pi/agent.js';
import { ContextTracker } from '../../protocol/context-tracker.js';
import { trackAgent, trackClient } from '../../protocol/tracking.js';
import type { MiniACPAgent, MiniACPClient } from '../../protocol/index.js';
import type { LLMConfig } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import { StopCode } from '../../types/stop-code.js';
import type { ToolDefinition, ToolResult } from '../../types/tool.js';
import { collect, type CollectResult } from '../../utils/collect.js';

export type LiveContextRestoreProbe = {
	readonly provider: string;
	readonly model: string;
	readonly apiKey: string;
	readonly reasoning?: LLMConfig['reasoning'];
	readonly timeoutMs: number;
};

type LiveContextRestoreScenario = {
	readonly tracker: ContextTracker;
	readonly client: MiniACPClient;
};

const PROJECT_NAME = 'dallas-v1';
const PROJECT_CODE = 'blue47';
const firstTurnPattern = new RegExp(`RECORDED|${PROJECT_CODE}`, 'i');
const projectCodePattern = new RegExp(`CODE\\s+${PROJECT_CODE}`, 'i');

const rememberProjectCodeTool: ToolDefinition = {
	name: 'remember_project_code',
	description:
		'Record a project code. The tool returns the recorded project and code as JSON.',
	inputSchema: {
		type: 'object',
		properties: {
			project: {
				type: 'string',
				description: 'The project name.',
			},
			code: {
				type: 'string',
				description: 'The exact project code to record.',
			},
		},
		required: ['project', 'code'],
	},
};

const systemPrompt = [
	'You are a terse integration probe.',
	'When a user asks you to record a project code, call remember_project_code exactly once.',
	'When a user later asks for the recorded code, answer from the conversation history.',
	'Keep final answers short.',
].join(' ');

const firstPrompt: UserMessage = {
	role: 'user',
	content: [
		{
			type: 'text',
			text: `Record that project ${PROJECT_NAME} has code ${PROJECT_CODE}. Use the remember_project_code tool, then reply exactly: RECORDED`,
		},
	],
};

const secondPrompt: UserMessage = {
	role: 'user',
	content: [
		{
			type: 'text',
			text: `What code was recorded for project ${PROJECT_NAME}? Reply exactly: CODE ${PROJECT_CODE}`,
		},
	],
};

export function itContinuesOnSameLiveAgent(
	probe: LiveContextRestoreProbe,
): void {
	it(
		`${formatProbeName(probe)} continues between turns on the same live agent`,
		async () => {
			const scenario = await startScenario(probe);

			await runFirstTurn(scenario);
			const second = await collect(scenario.client.prompt(secondPrompt));

			expectFinished(second);
			expect(expectAssistantText(second)).toMatch(projectCodePattern);
		},
		probe.timeoutMs,
	);
}

export function itContinuesAfterTrackedContextRestore(
	probe: LiveContextRestoreProbe,
): void {
	it(
		`${formatProbeName(probe)} continues after restoring tracked context`,
		async () => {
			const original = await startScenario(probe);
			await runFirstTurn(original);

			const restored = await createScenario();
			await restored.client.setContext(original.tracker.get());
			const second = await collect(restored.client.prompt(secondPrompt));

			expectFinished(second);
			expect(expectAssistantText(second)).toMatch(projectCodePattern);
		},
		probe.timeoutMs,
	);
}

export function itContinuesAcrossLiveContextRestoreCases(
	probe: LiveContextRestoreProbe,
): void {
	itContinuesOnSameLiveAgent(probe);
	itContinuesAfterTrackedContextRestore(probe);
}

async function startScenario(
	probe: LiveContextRestoreProbe,
): Promise<LiveContextRestoreScenario> {
	const scenario = await createScenario();

	await scenario.client.setContext({
		systemPrompt,
		tools: [rememberProjectCodeTool],
		config: createConfig(probe),
	});

	return scenario;
}

async function createScenario(): Promise<LiveContextRestoreScenario> {
	const tracker = new ContextTracker();
	const server = trackAgent(tracker, createToolServer());
	const client = trackClient(tracker, createPiAgent(server));

	await client.initialize();

	return { tracker, client };
}

function createConfig(probe: LiveContextRestoreProbe): LLMConfig {
	return {
		provider: probe.provider,
		model: probe.model,
		apiKey: probe.apiKey,
		reasoning: probe.reasoning,
	};
}

function formatProbeName(probe: LiveContextRestoreProbe): string {
	const reasoning = probe.reasoning ? ` reasoning=${probe.reasoning}` : '';
	return `${probe.provider}/${probe.model}${reasoning}`;
}

function createToolServer(): MiniACPAgent {
	const calls: string[] = [];
	return {
		toolExecute: async ({ call }): Promise<ToolResult> => {
			calls.push(call.name);
			if (call.name !== rememberProjectCodeTool.name) {
				return {
					toolCallId: call.id,
					isError: true,
					content: [{ type: 'text', text: `Unexpected tool: ${call.name}` }],
				};
			}
			return {
				toolCallId: call.id,
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							project: PROJECT_NAME,
							code: PROJECT_CODE,
							callCount: calls.length,
						}),
					},
				],
			};
		},
	};
}

async function runFirstTurn(
	scenario: LiveContextRestoreScenario,
): Promise<void> {
	const first = await collect(scenario.client.prompt(firstPrompt));
	expectFinished(first);
	expect(expectAssistantText(first)).toMatch(firstTurnPattern);
	expect(
		scenario.tracker
			.get()
			.messages.some(
				(message) =>
					message.role === 'toolResult' &&
					message.content.some(
						(content) =>
							content.type === 'text' && content.text.includes(PROJECT_CODE),
					),
			),
	).toBe(true);
}

function expectFinished(result: CollectResult): void {
	expect(result.turnEnd?.stopCode).toBe(StopCode.Finished);
}

function expectAssistantText(result: CollectResult): string {
	const text = result.messages
		.flatMap((message) =>
			message.role === 'assistant'
				? message.content.flatMap((content) =>
						content.type === 'text' ? [content.text] : [],
					)
				: [],
		)
		.join('\n');

	expect(text).not.toBe('');
	return text;
}
