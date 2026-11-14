import type {
	ToolCallRequestDescriptor,
	ToolCallsDescriptor,
} from './types.js';

export function toolCalls(
	calls: readonly ToolCallRequestDescriptor[],
	options: Pick<ToolCallsDescriptor, 'stepUsage'> = {},
): ToolCallsDescriptor {
	return { type: 'toolCalls', calls, ...options };
}
