import { wait } from '@franklin/lib';

import type { TurnServer } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import { StopCode } from '../types/stop-code.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolCall, ToolResult } from '../types/tool.js';
import type {
	AssistantTextDescriptor,
	AssistantThinkingDescriptor,
	MockTurnDescriptor,
	MockTurnStepDescriptor,
	TextChunkDescriptor,
	ToolCallsDescriptor,
	TurnEndDescriptor,
} from './descriptor/index.js';
import type { MutableMockMiniACPRecording } from './recording.js';

export type MockTurnExecutionInput = {
	readonly descriptor: MockTurnDescriptor;
	readonly ctx: Ctx;
	readonly prompt: UserMessage;
	readonly server: TurnServer;
	readonly recording: MutableMockMiniACPRecording;
	readonly nextMessageId: () => string;
	readonly nextToolCallId: () => string;
};

export async function* executeMockTurn(
	input: MockTurnExecutionInput,
): AsyncGenerator<StreamEvent> {
	const toolCalls: ToolCall[] = [];
	const toolResults: ToolResult[] = [];
	let ended = false;

	yield { type: 'turnStart' };

	for await (const event of executeSteps(input.descriptor)) {
		ended ||= event.type === 'turnEnd';
		yield event;
	}

	if (!ended) {
		throw new Error('Mock turn descriptor must include turnEnd().');
	}

	async function* executeSteps(
		steps: MockTurnDescriptor,
	): AsyncGenerator<StreamEvent> {
		for (const step of steps) {
			yield* executeStep(step);
		}
	}

	async function* executeStep(
		step: MockTurnStepDescriptor,
	): AsyncGenerator<StreamEvent> {
		switch (step.type) {
			case 'assistantText':
				yield* executeAssistantContent(step, 'text');
				break;
			case 'assistantThinking':
				yield* executeAssistantContent(step, 'thinking');
				break;
			case 'toolCalls':
				await executeToolCalls(step);
				break;
			case 'delay':
				await wait(step.ms);
				break;
			case 'turnEnd':
				yield toTurnEnd(step);
				break;
			case 'derive':
				yield* executeSteps(
					await step.run({
						ctx: input.ctx,
						prompt: input.prompt,
						toolCalls,
						toolResults,
					}),
				);
				break;
		}
	}

	async function* executeAssistantContent(
		step: AssistantTextDescriptor | AssistantThinkingDescriptor,
		contentType: 'text' | 'thinking',
	): AsyncGenerator<StreamEvent> {
		const messageId = input.nextMessageId();

		if (step.chunks) {
			for (const chunk of step.chunks) {
				await waitForChunk(chunk);
				yield {
					type: 'chunk',
					messageId,
					role: 'assistant',
					content: { type: contentType, text: chunk.text },
				};
			}
		}

		yield {
			type: 'update',
			messageId,
			message: {
				role: 'assistant',
				content: [{ type: contentType, text: step.text }],
			},
		};
	}

	async function executeToolCalls(step: ToolCallsDescriptor): Promise<void> {
		const phase: ToolCall[] = [];

		for (const request of step.calls) {
			const call: ToolCall = {
				type: 'toolCall',
				id: input.nextToolCallId(),
				name: request.name,
				arguments: request.arguments ?? {},
			};
			phase.push(call);
			toolCalls.push(call);
			input.recording.toolCalls.push(call);

			const result = await input.server.toolExecute({ call });
			toolResults.push(result);
			input.recording.toolResults.push(result);
		}

		input.recording.toolCallPhases.push(phase);
	}
}

async function waitForChunk(chunk: TextChunkDescriptor): Promise<void> {
	if (chunk.delayMs === undefined || chunk.delayMs <= 0) return;
	await wait(chunk.delayMs);
}

function toTurnEnd(step: TurnEndDescriptor): StreamEvent {
	return {
		type: 'turnEnd',
		stopCode: step.stopCode ?? StopCode.Finished,
		...(step.stopMessage === undefined
			? {}
			: { stopMessage: step.stopMessage }),
		...(step.usage === undefined ? {} : { usage: step.usage }),
	};
}
