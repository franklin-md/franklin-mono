import type { ToolDefinition } from '@franklin/mini-acp';
import type { JsonObject, JsonValue } from '@franklin/lib';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { RenderedToolOutput, ToolInvocation } from './tool.js';

export type ToolSourceTool = {
	readonly definition: ToolDefinition;
	execute(
		args: JsonObject,
		invocation: ToolInvocation,
	): MaybePromise<JsonValue>;
	render?(output: JsonValue): MaybePromise<RenderedToolOutput>;
};

/** Runtime-owned tools, prepared before context synchronization and disposed with the agent. */
export type ToolSource = {
	prepare(signal: AbortSignal): Promise<readonly ToolSourceTool[]>;
	dispose(): Promise<void>;
};
