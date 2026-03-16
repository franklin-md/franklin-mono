import { serve as genericServe } from '@franklin/transport';

import type { ToolCall, McpToolStream } from './types.js';

export type ToolHandler = (request: ToolCall) => Promise<unknown>;

export function serve(stream: McpToolStream, handler: ToolHandler): void {
	genericServe(stream, handler);
}
