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
	if (isRenderedToolOutput(value)) {
		return value;
	}

	return {
		content: [
			{
				type: 'text',
				text: stringifyToolOutput(value),
			},
		],
	};
}

function isRenderedToolOutput(value: JsonValue): value is RenderedToolOutput {
	return (
		isJsonObject(value) &&
		hasOnlyKeys(value, ['content', 'isError']) &&
		Array.isArray(value.content) &&
		value.content.every(isToolResultContent) &&
		(value.isError === undefined || typeof value.isError === 'boolean')
	);
}

function isToolResultContent(value: JsonValue): value is ToolResultContent {
	if (!isJsonObject(value)) {
		return false;
	}

	if (value.type === 'text') {
		return (
			hasOnlyKeys(value, ['type', 'text']) && typeof value.text === 'string'
		);
	}

	if (value.type === 'image') {
		return (
			hasOnlyKeys(value, ['type', 'data', 'mimeType']) &&
			typeof value.data === 'string' &&
			typeof value.mimeType === 'string'
		);
	}

	return false;
}

function hasOnlyKeys(
	value: Record<string, JsonValue>,
	keys: readonly string[],
): boolean {
	return Object.keys(value).every((key) => keys.includes(key));
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
