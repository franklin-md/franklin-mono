import type { ToolResult, ToolResultContent } from '@franklin/mini-acp';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ToolArgsOf, ToolOutputOf, ToolSpec } from './tool-spec.js';

export type ToolOutput = {
	content: ToolResultContent[];
	isError?: boolean;
};

export type ToolResultWithOutput<TOutput = unknown> = ToolResult & {
	output?: TOutput;
};

export function defaultToolRenderOutput(value: unknown): ToolOutput {
	return {
		content: [
			{
				type: 'text',
				text: stringifyToolOutput(value),
			},
		],
	};
}

function stringifyToolOutput(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	if (
		value === undefined ||
		typeof value === 'function' ||
		typeof value === 'symbol'
	) {
		return String(value);
	}
	return JSON.stringify(value);
}

export type ToolCallExecute<S extends ToolSpec, Ctx extends BaseRuntime> = (
	params: ToolArgsOf<S>,
	ctx: Ctx,
) => MaybePromise<ToolOutputOf<S>>;

export type ToolCallRender<S extends ToolSpec, Ctx extends BaseRuntime> = (
	output: ToolOutputOf<S>,
	params: ToolArgsOf<S>,
	ctx: Ctx,
) => MaybePromise<ToolOutput>;

export type ToolHandlers<S extends ToolSpec, Ctx extends BaseRuntime> = {
	execute: ToolCallExecute<S, Ctx>;
	render?: ToolCallRender<S, Ctx>;
};
