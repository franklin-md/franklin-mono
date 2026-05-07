import type {
	ToolCallRequestDescriptor,
	ToolCallsDescriptor,
} from './types.js';

export function toolCalls(
	calls: readonly ToolCallRequestDescriptor[],
): ToolCallsDescriptor {
	return { type: 'toolCalls', calls };
}
