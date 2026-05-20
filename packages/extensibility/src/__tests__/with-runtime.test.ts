import { describe, expect, it } from 'vitest';

import type { API, BaseRuntime, Signature, WithRuntime } from '../index.js';
import { bindAllWithRuntime, bindWithRuntime } from '../index.js';

type Runtime = BaseRuntime & {
	readonly value: string;
};

type Handler = (input: string) => string;

interface RuntimeAwareAPI<R extends BaseRuntime> {
	onValue(handler: WithRuntime<Handler, R>): void;
}

interface RuntimeAwareSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPI<this['In']>;
}

type RuntimeAwareSurface = API<RuntimeAwareSignature, Runtime>;

const _runtimeAwareSurface = null as unknown as RuntimeAwareSurface;
void _runtimeAwareSurface;

describe('WithRuntime helpers', () => {
	it('binds a runtime-aware callback to its original signature', () => {
		const runtime: Runtime = {
			value: 'ctx',
			dispose: async () => {},
		};
		const raw: WithRuntime<Handler, Runtime> = (input, ctx) =>
			`${input}:${ctx.value}`;

		const bound = bindWithRuntime(raw, () => runtime);

		expect(bound('value')).toBe('value:ctx');
	});

	it('binds arrays of runtime-aware callbacks', () => {
		const runtime: Runtime = {
			value: 'ctx',
			dispose: async () => {},
		};
		const raw: WithRuntime<Handler, Runtime>[] = [
			(input, ctx) => `${input}:${ctx.value}:a`,
			(input, ctx) => `${input}:${ctx.value}:b`,
		];

		const bound = bindAllWithRuntime(raw, () => runtime);

		expect(bound.map((handler) => handler('value'))).toEqual([
			'value:ctx:a',
			'value:ctx:b',
		]);
	});
});
