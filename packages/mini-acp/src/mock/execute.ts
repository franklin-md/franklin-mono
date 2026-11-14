import { wait } from '@franklin/lib';
import { ZERO_USAGE } from '../protocol/usage-tracker.js';

import type { MuAgent } from '../protocol/types.js';
import type { Context } from '../types/context.js';
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
import { joinChunks } from './descriptor/chunks.js';

export type MockTurnExecutionInput = {
	readonly descriptor: MockTurnDescriptor;
	readonly context: Context;
	readonly isCancelled: () => boolean;
	readonly prompt: UserMessage;
	readonly server: MuAgent;
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

	if (!ended && !input.isCancelled()) {
		throw new Error('Mock turn descriptor must include turnEnd().');
	}

	async function* executeSteps(
		steps: MockTurnDescriptor,
	): AsyncGenerator<StreamEvent> {
		for (const step of steps) {
			if (input.isCancelled()) return;
			yield* executeStep(step);
		}
	}

	async function* executeStep(
		step: MockTurnStepDescriptor,
	): AsyncGenerator<StreamEvent> {
		if (ended) {
			throw new Error(
				'Mock turn descriptor must not include steps after turnEnd().',
			);
		}

		switch (step.type) {
			case 'assistantText':
				yield* executeAssistantContent(step, 'text');
				break;
			case 'assistantThinking':
				yield* executeAssistantContent(step, 'thinking');
				break;
			case 'toolCalls':
				await executeToolCalls(step);
				if (step.calls.length > 0)
					yield {
						type: 'stepEnd',
						stepUsage: step.stepUsage ?? ZERO_USAGE,
					};
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
						context: input.context,
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
		const startedAt = Date.now();
		const emittedChunks: TextChunkDescriptor[] = [];

		if (step.chunks) {
			for (const chunk of step.chunks) {
				if (input.isCancelled()) break;
				await waitForChunk(chunk, startedAt, step.chunkDelayMode ?? 'relative');
				if (input.isCancelled()) break;
				emittedChunks.push(chunk);
				yield {
					type: 'chunk',
					messageId,
					role: 'assistant',
					content: { type: contentType, text: chunk.text },
				};
			}
		}

		// Finish already-delivered chunks before the driver publishes cancellation;
		// later descriptor actions must not run just to obtain their final update.
		if (input.isCancelled() && emittedChunks.length === 0) return;
		yield {
			type: 'update',
			messageId,
			message: {
				role: 'assistant',
				content: [
					{
						type: contentType,
						text: input.isCancelled() ? joinChunks(emittedChunks) : step.text,
					},
				],
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

async function waitForChunk(
	chunk: TextChunkDescriptor,
	startedAt: number,
	delayMode: 'relative' | 'elapsed',
): Promise<void> {
	if (chunk.delayMs === undefined || chunk.delayMs <= 0) return;
	switch (delayMode) {
		case 'relative':
			await wait(chunk.delayMs);
			break;
		case 'elapsed': {
			const remaining = startedAt + chunk.delayMs - Date.now();
			if (remaining > 0) await wait(remaining);
			break;
		}
	}
}

function toTurnEnd(step: TurnEndDescriptor): StreamEvent {
	return {
		type: 'turnEnd',
		stopCode: step.stopCode ?? StopCode.Finished,
		...(step.stopMessage === undefined
			? {}
			: { stopMessage: step.stopMessage }),
		stepUsage: step.usage ?? ZERO_USAGE,
		usage: step.usage ?? ZERO_USAGE,
	};
}
