import type {
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
} from '@agentclientprotocol/sdk';

import type { Middleware } from '../../stack.js';
import type { FranklinModule, ModuleCreateContext } from './types.js';

/**
 * Creates a Middleware that composes an array of FranklinModules.
 *
 * - Intercepts `newSession` to run `onCreate` hooks and inject MCP servers.
 * - Intercepts `prompt` to run `onPrompt` hooks and prepend system prompts
 *   (collected from `onCreate`) to the first prompt only.
 * - Intercepts `dispose` to run `onDispose` hooks.
 */
export function createModuleMiddleware(modules: FranklinModule[]): Middleware {
	// System prompt fragments collected during onCreate, delivered on first prompt.
	const systemPrompts: string[] = [];
	let firstPromptFired = false;

	return {
		async newSession(
			params: NewSessionRequest,
			next: (params: NewSessionRequest) => Promise<NewSessionResponse>,
		) {
			const ctx: ModuleCreateContext = { cwd: params.cwd };
			const extraServers: NewSessionRequest['mcpServers'] = [];

			// Run onCreate hooks in order
			for (const mod of modules) {
				if (mod.onCreate) {
					const result = await mod.onCreate(ctx);
					if (result.mcpServers) {
						extraServers.push(...result.mcpServers);
					}
					if (result.systemPrompt) {
						systemPrompts.push(result.systemPrompt);
					}
				}
			}

			// Inject collected MCP servers into the newSession request
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

			// Prepend system prompts to the first prompt only
			if (!firstPromptFired && systemPrompts.length > 0) {
				firstPromptFired = true;
				const systemBlock = {
					type: 'text' as const,
					text: systemPrompts.join('\n\n'),
				};
				prompt = [systemBlock, ...prompt];
			} else if (!firstPromptFired) {
				firstPromptFired = true;
			}

			// Run onPrompt hooks in order
			let ctx = { sessionId: params.sessionId, prompt };
			for (const mod of modules) {
				if (mod.onPrompt) {
					ctx = await mod.onPrompt(ctx);
				}
			}

			return next({ ...params, prompt: ctx.prompt });
		},

		async dispose(
			_params: undefined,
			next: (params: undefined) => Promise<void>,
		) {
			// Run onDispose hooks (all modules, don't short-circuit on error)
			const errors: unknown[] = [];
			for (const mod of modules) {
				if (mod.onDispose) {
					try {
						await mod.onDispose();
					} catch (err) {
						errors.push(err);
					}
				}
			}

			await next(undefined);

			if (errors.length > 0) {
				throw errors[0];
			}
		},
	};
}
