import type { ToolResultContent } from '@franklin/mini-acp';
import type { MaybePromise } from '../../types/shared.js';
import type { z } from 'zod';

export type ToolOutput = {
	content: ToolResultContent[];
	isError?: boolean;
};

export type ToolExecuteReturn = string | ToolOutput;

export function resolveToolOutput(value: ToolExecuteReturn): ToolOutput {
	if (typeof value === 'string') {
		return { content: [{ type: 'text', text: value }] };
	}
	return value;
}

export interface ExtensionToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	schema: z.ZodType<TInput>;
	execute(params: TInput): MaybePromise<ToolExecuteReturn>;
}
