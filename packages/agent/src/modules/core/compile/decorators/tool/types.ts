import type { BaseRuntime } from '@franklin/extensibility';
import type { Observer } from '@franklin/lib';
import type { ToolCallEvent, ToolResultEvent } from '../../../api/handlers.js';
import type { AnyRegisteredTool } from '../../tools/index.js';

export type ToolObservers = {
	readonly toolCall: Observer<[ToolCallEvent]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};

export type ToolLayer<Runtime extends BaseRuntime> = {
	readonly tools: readonly AnyRegisteredTool<Runtime>[];
	readonly observers: ToolObservers;
	readonly getRuntime: () => Runtime;
};
