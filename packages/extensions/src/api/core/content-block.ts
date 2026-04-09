import type { ToolResultContent } from '@franklin/mini-acp';

/**
 * Structured content-block result for tools that produce
 * text/image blocks directly (e.g. Pi tool bridge).
 *
 * Tools returning this shape bypass the default JSON.stringify
 * wrapping in buildToolExecuteMiddleware.
 */
export interface ContentBlockResult {
	content: ToolResultContent[];
	isError?: boolean;
}

export function isContentBlockResult(
	output: unknown,
): output is ContentBlockResult {
	if (typeof output !== 'object' || output === null || !('content' in output)) {
		return false;
	}
	const arr = (output as ContentBlockResult).content;
	if (!Array.isArray(arr) || arr.length === 0) return false;
	const first: unknown = arr[0];
	return typeof first === 'object' && first !== null && 'type' in first;
}
