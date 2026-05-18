import { describe, expect, it, vi } from 'vitest';
import type { Signature } from '../../api/index.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import {
	createRegistryView,
	type RegistryView,
} from '../../extension-points/view.js';
import type { BaseRuntime } from '../../runtime/index.js';
import { build, compile, register } from '../compile.js';
import type { Compiler } from '../types.js';

type LabelAPI = {
	registerLabel(label: string): void;
};

interface LabelSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: LabelAPI;
}

type LabelRuntime = BaseRuntime & {
	readonly labels: string[];
};

const labelExtensionPoint = createExtensionPoint<LabelSignature>({
	registerLabel: true,
});

function createLabelCompiler(): Compiler<LabelSignature, LabelRuntime> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<LabelSignature, ContextRuntime>,
		) {
			return {
				labels: registry.argsFor('registerLabel').map(([label]) => label),
				dispose: vi.fn(async () => {}),
				subscribe: vi.fn(() => () => {}),
			};
		},
	};
}

describe('compile', () => {
	it('registers an extension into a populated registry', () => {
		const registry = register<LabelSignature, LabelRuntime>(
			labelExtensionPoint,
			(api) => {
				api.registerLabel('one');
				api.registerLabel('two');
			},
		);

		expect(createRegistryView(registry).argsFor('registerLabel')).toEqual([
			['one'],
			['two'],
		]);
	});

	it('builds a runtime from a populated registry and compiler', async () => {
		const registry = register<LabelSignature, LabelRuntime>(
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
