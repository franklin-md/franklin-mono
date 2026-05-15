import { describe, expect, it } from 'vitest';
import { resolveState } from '../resolve.js';

type TestState = {
	readonly core: {
		readonly messages: string[];
		readonly llmConfig: {
			readonly model: string;
			readonly provider: string;
		};
	};
	readonly store: {
		readonly count: number;
	};
};

describe('resolveState', () => {
	it('returns the base state when no overrides are supplied', () => {
		const base: TestState = {
			core: {
				messages: [],
				llmConfig: { model: 'fallback', provider: 'test' },
			},
			store: { count: 1 },
		};

		expect(resolveState(base)).toBe(base);
	});

	it('deep-merges plain object overrides while replacing arrays', () => {
		const base: TestState = {
			core: {
				messages: ['original'],
				llmConfig: { model: 'fallback', provider: 'test' },
			},
			store: { count: 1 },
		};

		const resolved = resolveState(base, {
			core: {
				messages: ['override'],
				llmConfig: {
					model: 'selected',
					provider: undefined as never,
				},
			},
			store: undefined as never,
		});

		expect(resolved).toEqual({
			core: {
				messages: ['override'],
				llmConfig: { model: 'selected', provider: 'test' },
			},
			store: { count: 1 },
		});
		expect(resolved.core).not.toBe(base.core);
		expect(resolved.core.messages).not.toBe(base.core.messages);
		expect(resolved.store).toBe(base.store);
	});
});
