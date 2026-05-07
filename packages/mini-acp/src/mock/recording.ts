import type { CtxPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { ToolCall, ToolResult } from '../types/tool.js';

export type MockMiniACPRecording = {
	readonly initialize: number;
	readonly setContext: readonly CtxPatch[];
	readonly prompts: readonly UserMessage[];
	readonly toolCallPhases: readonly (readonly ToolCall[])[];
	readonly toolCalls: readonly ToolCall[];
	readonly toolResults: readonly ToolResult[];
	readonly cancels: number;
	readonly disposes: number;
};

export type MutableMockMiniACPRecording = {
	initialize: number;
	setContext: CtxPatch[];
	prompts: UserMessage[];
	toolCallPhases: ToolCall[][];
	toolCalls: ToolCall[];
	toolResults: ToolResult[];
	cancels: number;
	disposes: number;
};

export function createRecording(): MutableMockMiniACPRecording {
	return {
		initialize: 0,
		setContext: [],
		prompts: [],
		toolCallPhases: [],
		toolCalls: [],
		toolResults: [],
		cancels: 0,
		disposes: 0,
	};
}

export function snapshotRecording(
	recording: MutableMockMiniACPRecording,
): MockMiniACPRecording {
	return {
		initialize: recording.initialize,
		setContext: [...recording.setContext],
		prompts: [...recording.prompts],
		toolCallPhases: recording.toolCallPhases.map((calls) => [...calls]),
		toolCalls: [...recording.toolCalls],
		toolResults: [...recording.toolResults],
		cancels: recording.cancels,
		disposes: recording.disposes,
	};
}

export function resetRecording(recording: MutableMockMiniACPRecording): void {
	recording.initialize = 0;
	recording.setContext = [];
	recording.prompts = [];
	recording.toolCallPhases = [];
	recording.toolCalls = [];
	recording.toolResults = [];
	recording.cancels = 0;
	recording.disposes = 0;
}
