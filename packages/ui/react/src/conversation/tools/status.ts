import type { ToolUseBlock } from '@franklin/extensions';

import type { ToolStatus } from './types.js';

export function computeToolStatus(block: ToolUseBlock): ToolStatus {
	if (!block.result) return 'in-progress';
	if (block.isError) return 'error';
	return 'success';
}
