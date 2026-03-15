import type {
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
} from '@agentclientprotocol/sdk';

import type { Middleware } from '../../stack/index.js';
import { emptyMiddleware } from '../../stack/index.js';
import type { FranklinModule } from './types.js';
import { SystemPromptBuilder } from './types.js';

// Symbol key used to thread the SystemPromptBuilder through newSession params.
// When multiple module middlewares are composed via sequence(), they all share
// the same builder instance via this key.
const BUILDER_KEY = Symbol.for('franklin:systemPromptBuilder');

type ParamsWithBuilder = NewSessionRequest & {
	[BUILDER_KEY]?: SystemPromptBuilder;
};

/**
 * Creates a Middleware from a single FranklinModule.
 *
 * - Intercepts `newSession` to run the module's `onCreate` hook and inject MCP servers.
 * - Intercepts `prompt` to materialize the system prompt (from the shared builder)
 *   on the first prompt only, then run the module's `onPrompt` hook.
 *
 * To compose multiple modules, create one middleware per module and use `sequence()`:
 * ```ts
 * sequence([createModuleMiddleware(modA), createModuleMiddleware(modB)])
 * ```
 */
export function createModuleMiddleware(module: FranklinModule): Middleware {
	let builder: SystemPromptBuilder | undefined;
	let isOwner = false;
	let firstPromptFired = false;

	return {
		...emptyMiddleware,

		async newSession(
			params: NewSessionRequest,
			next: (params: NewSessionRequest) => Promise<NewSessionResponse>,
		) {
			const withBuilder = params as ParamsWithBuilder;

			// Get or create the shared builder
			if (withBuilder[BUILDER_KEY]) {
				builder = withBuilder[BUILDER_KEY];
				isOwner = false;
			} else {
				builder = new SystemPromptBuilder();
				withBuilder[BUILDER_KEY] = builder;
				isOwner = true;
			}

			let extraServers: NewSessionRequest['mcpServers'] = [];

			if (module.onCreate) {
				const result = await module.onCreate({
					cwd: params.cwd,
					systemPrompt: builder,
				});
				if (result.mcpServers) {
					extraServers = result.mcpServers;
				}
			}

			return next({
				...params,
				mcpServers: [...params.mcpServers, ...extraServers],
			});
		},

		async prompt(
			params: PromptRequest,
			next: (params: PromptRequest) => Promise<PromptResponse>,
		) {
			let { prompt } = params;

			// Only the owner (outermost middleware) materializes the system prompt
			if (!firstPromptFired && isOwner && builder) {
				firstPromptFired = true;
				const text = builder.build();
				if (text) {
					prompt = [{ type: 'text' as const, text }, ...prompt];
				}
			} else if (!firstPromptFired) {
				firstPromptFired = true;
			}

			// Run onPrompt hook
			if (module.onPrompt) {
				const ctx = await module.onPrompt({
					sessionId: params.sessionId,
					prompt,
				});
				prompt = ctx.prompt;
			}

			return next({ ...params, prompt });
		},
	};
}
