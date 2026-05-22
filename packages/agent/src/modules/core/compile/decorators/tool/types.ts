import type { BaseRuntime } from '@franklin/extensibility';
import type { Observer } from '@franklin/lib';
import type { ToolExecuteParams } from '@franklin/mini-acp';
import type { ToolResultEvent } from '../../../api/handlers.js';
import type { AnyRegisteredTool } from '../../tools/index.js';

export type ToolObservers = {
	readonly toolCall: Observer<[ToolExecuteParams]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};

export type ToolLayer<Runtime extends BaseRuntime> = {
	readonly tools: readonly AnyRegisteredTool<Runtime>[];
	readonly observers: ToolObservers;
	readonly getRuntime: () => Runtime;
};
