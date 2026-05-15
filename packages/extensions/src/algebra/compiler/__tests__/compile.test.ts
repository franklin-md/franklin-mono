import { describe, expect, it, vi } from 'vitest';
import type { API } from '../../api/index.js';
import type { Registry } from '../../extension-points/registry.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { BaseRuntime } from '../../runtime/index.js';
import { build, compile, register } from '../compile.js';
import type { Compiler } from '../types.js';

type LabelAPISurface = {
	registerLabel(label: string): void;
};

interface LabelAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: LabelAPISurface;
}

type LabelRuntime = BaseRuntime & {
	readonly labels: string[];
};

const labelExtensionPoint = createExtensionPoint<LabelAPI>({
	registerLabel: true,
});

function createLabelCompiler(): Compiler<LabelAPI, LabelRuntime> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: Registry<LabelAPI, ContextRuntime>,
		) {
			return {
				labels: registry.registerLabel.map(([label]) => label),
				dispose: vi.fn(async () => {}),
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

describe('compile', () => {
	it('registers an extension into a populated registry', () => {
		const registry = register<LabelAPI, LabelRuntime>(
			labelExtensionPoint,
			(api) => {
				api.registerLabel('one');
				api.registerLabel('two');
			},
		);

		expect(registry.registerLabel).toEqual([['one'], ['two']]);
	});

	it('builds a runtime from a populated registry and compiler', async () => {
		const registry = register<LabelAPI, LabelRuntime>(
			labelExtensionPoint,
			(api) => {
				api.registerLabel('built');
			},
		);

		const runtime = await build(registry, createLabelCompiler());

		expect(runtime.labels).toEqual(['built']);
	});

	it('runs the extension-point algorithm and passes the populated registry to the compiler', async () => {
		const runtime = await compile(
			labelExtensionPoint,
			createLabelCompiler(),
			(api) => {
				api.registerLabel('one');
				api.registerLabel('two');
			},
		);

		expect(runtime.labels).toEqual(['one', 'two']);
	});
});
