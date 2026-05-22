import type { BaseRuntime } from '@franklin/extensibility';
import type {
	ToolObserverEvent,
	ToolObserverHandler,
} from '../../../api/handlers.js';
import type { AnyRegisteredTool } from '../../tools/index.js';

export type ToolObservers = {
	[K in ToolObserverEvent]: ToolObserverHandler<K>[];
};

export type ToolLayer<Runtime extends BaseRuntime> = {
	readonly tools: readonly AnyRegisteredTool<Runtime>[];
	readonly observers: ToolObservers;
	readonly getRuntime: () => Runtime;
};
