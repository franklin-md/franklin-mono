import type { Store } from '../../store/types.js';
import type { ExtensionToolDefinition } from './tool.js';
import type {
	PromptHandler,
	SessionStartHandler,
	SessionUpdateHandler,
} from './handlers.js';

/**
 * An extension is a named setup function that receives an ExtensionAPI.
 * During setup, the extension registers hooks and tools. After setup,
 * the extension is compiled into a single Middleware.
 *
 * Stateful extensions declare their shared state type via the generic
 * parameter and expose it as a `Store<T>` for UI binding and external
 * mutation. Stateless extensions omit `state` (defaults to `void`).
 */
export interface Extension<T = void> {
	name: string;
	state?: Store<T>;
	setup: (api: ExtensionAPI) => Promise<void>;
}

/**
 * The collector surface exposed to an extension's setup() function.
 */
export interface ExtensionAPI {
	on(event: 'sessionStart', handler: SessionStartHandler): void;
	on(event: 'prompt', handler: PromptHandler): void;
	on(event: 'sessionUpdate', handler: SessionUpdateHandler): void;

	registerTool(tool: ExtensionToolDefinition): void;

	// TODO: systemPrompt contribution — may be handled via prompt hook
	// or a dedicated api.systemPrompt.append/prepend() mechanism
}
