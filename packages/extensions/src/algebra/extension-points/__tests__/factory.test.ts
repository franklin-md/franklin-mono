import { describe, expect, it } from 'vitest';
import type { API } from '../../api/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { createExtensionPoint } from '../create.js';

type TestAPISurface = {
	readonly registerText: (value: string) => void;
	readonly registerPair: (first: number, second: boolean) => void;
};

interface TestAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: TestAPISurface;
}

describe('createExtensionPoint', () => {
	it('creates a registry and API methods for every contribution key', () => {
		const extensionPoint = createExtensionPoint<TestAPI>({
			registerText: true,
			registerPair: true,
		});

		const registry = extensionPoint.createRegistry();
		expect(registry).toEqual({
			registerText: [],
			registerPair: [],
		});

		const api = extensionPoint.createApi<BaseRuntime>(registry);
		api.registerText('hello');
		api.registerPair(1, true);

		expect(registry).toEqual({
			registerText: [['hello']],
			registerPair: [[1, true]],
		});
	});

	it('supports identity extension points with no contribution keys', () => {
		const extensionPoint = createExtensionPoint<TestAPI>({
			registerText: true,
			registerPair: true,
		});
		const identity = createExtensionPoint<{
			readonly In: BaseRuntime;
			readonly Out: Record<never, never>;
		}>({});

		expect(extensionPoint.createRegistry()).toEqual({
			registerText: [],
			registerPair: [],
		});
		expect(identity.createRegistry()).toEqual({});
		expect(identity.createApi(identity.createRegistry())).toEqual({});
	});
});
