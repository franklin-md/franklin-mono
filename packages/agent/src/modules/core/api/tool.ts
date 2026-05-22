import type { ToolResultContent } from '@franklin/mini-acp';
import type { JsonValue } from '@franklin/lib';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ToolArgsOf, ToolOutputOf, ToolSpec } from './tool-spec.js';

export type RenderedToolOutput = {
	content: ToolResultContent[];
	isError?: boolean;
};

export function defaultToolRenderOutput(value: JsonValue): RenderedToolOutput {
	return {
		content: [
			{
				type: 'text',
				text: stringifyToolOutput(value),
			},
		],
	};
}

function stringifyToolOutput(value: JsonValue): string {
	if (typeof value === 'string') {
		return value;
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
) => MaybePromise<RenderedToolOutput>;

export type ToolHandlers<S extends ToolSpec, Ctx extends BaseRuntime> = {
	execute: ToolCallExecute<S, Ctx>;
	render?: ToolCallRender<S, Ctx>;
};
