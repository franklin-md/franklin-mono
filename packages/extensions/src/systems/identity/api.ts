import type { API } from '../../algebra/api/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';

export type IdentityAPISurface = Record<never, never>;

export interface IdentityAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: IdentityAPISurface;
}

export function identityAPI(): IdentityAPISurface {
	return {};
}
