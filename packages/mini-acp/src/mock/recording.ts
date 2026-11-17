import type { ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { ToolCall, ToolResult } from '../types/tool.js';

export type MockMiniACPRecording = {
	readonly initialize: number;
	readonly setContext: readonly ContextPatch[];
	readonly prompts: readonly UserMessage[];
	readonly toolCallPhases: readonly (readonly ToolCall[])[];
	readonly toolCalls: readonly ToolCall[];
	readonly toolResults: readonly ToolResult[];
	readonly continues: number;
	readonly cancels: number;
	readonly disposes: number;
};

export type MutableMockMiniACPRecording = {
	initialize: number;
	setContext: ContextPatch[];
	prompts: UserMessage[];
	toolCallPhases: ToolCall[][];
	toolCalls: ToolCall[];
	toolResults: ToolResult[];
	continues: number;
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
		continues: 0,
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
		continues: recording.continues,
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
	recording.continues = 0;
	recording.cancels = 0;
	recording.disposes = 0;
}
