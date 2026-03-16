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
 */
export interface Extension {
	name: string;
	setup: (api: ExtensionAPI) => void | Promise<void>;
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
