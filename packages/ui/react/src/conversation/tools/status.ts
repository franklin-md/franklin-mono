import type { ToolUseBlock } from '@franklin/agent';

import type { ToolStatus } from './types.js';

export function computeToolStatus(block: ToolUseBlock): ToolStatus {
	if (!block.result) return 'in-progress';
	if (block.result.isError) return 'error';
	return 'success';
}
