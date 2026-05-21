import type { BaseRuntime } from '@franklin/extensibility';
import type {
	ToolObserverEvent,
	ToolObserverHandler,
} from '../../../api/handlers.js';
import type { RegisteredTool } from '../../tools/index.js';

export type ToolObservers = {
	[K in ToolObserverEvent]: ToolObserverHandler<K>[];
};

export type ToolLayer<Runtime extends BaseRuntime> = {
	readonly tools: readonly RegisteredTool<unknown, Runtime>[];
	readonly observers: ToolObservers;
	readonly getRuntime: () => Runtime;
};
