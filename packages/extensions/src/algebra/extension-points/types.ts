import type { Apply } from '@franklin/lib';
import type { API as APIFamily } from '../api/types.js';
import type { Registry } from './registry.js';

export type ExtensionPoint<API extends APIFamily> = {
	createRegistry(): Registry<API>;
	createApi<R extends API['In']>(registry: Registry<API>): Apply<API, R>;
};
