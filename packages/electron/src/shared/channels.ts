// Auth -- invoke channels (renderer -> main)
export const AUTH_GET_PROVIDERS = 'franklin:auth:getProviders';
export const AUTH_GET_CANONICAL_PROVIDERS =
	'franklin:auth:getCanonicalProviders';
export const AUTH_LOAD = 'franklin:auth:load';
export const AUTH_GET_API_KEY = 'franklin:auth:getApiKey';
export const AUTH_SET_ENTRY = 'franklin:auth:setEntry';
export const AUTH_REMOVE_ENTRY = 'franklin:auth:removeEntry';
export const AUTH_START_LOGIN = 'franklin:auth:startLogin';
export const AUTH_OPEN_EXTERNAL = 'franklin:auth:openExternal';

// Auth -- one-way send (renderer -> main)
export const AUTH_PROMPT_RESPONSE = 'franklin:auth:promptResponse';

// Auth -- main -> renderer push events (within an active OAuth flow)
export const AUTH_ON_CHANGE = 'franklin:auth:onChange';
export const AUTH_OAUTH_ON_AUTH = 'franklin:auth:oauth:onAuth';
export const AUTH_OAUTH_ON_PROGRESS = 'franklin:auth:oauth:onProgress';
export const AUTH_OAUTH_ON_PROMPT = 'franklin:auth:oauth:onPrompt';
export const APP_GET_STORAGE = 'franklin:app:getStorage';

// ---------------------------------------------------------------------------
// Recursive channel scope -- self-similar at every nesting level
// ---------------------------------------------------------------------------

/**
 * A channel scope provides deterministic channel names at a given depth.
 * At a resource boundary, `resource(path).inner()` returns a new scope
 * with the same interface but narrower channel prefix.
 */
export interface ChannelScope {
	method(path: readonly string[]): string;
	stream(path: readonly string[]): string;
	resource(path: readonly string[]): ResourceScope;
}

export interface ResourceScope {
	readonly connect: string;
	readonly kill: string;
	inner(): ChannelScope;
}

export function createScope(prefix: string): ChannelScope {
	return {
		method: (path) => [prefix, ...path].join(':'),
		stream: (path) => [prefix, ...path, 'stream'].join(':'),
		resource: (path) => {
			const base = [prefix, ...path].join(':');
			const leaseBase = `${base}:lease`;
			return {
				connect: `${base}:connect`,
				kill: `${base}:kill`,
				inner(): ChannelScope {
					return createScope(leaseBase);
				},
			};
		},
	};
}
