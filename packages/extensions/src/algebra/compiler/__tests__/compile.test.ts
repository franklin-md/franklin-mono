import { describe, expect, it, vi } from 'vitest';
import type { API } from '../../api/index.js';
import type { Registry } from '../../extension-points/registry.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { BaseRuntime } from '../../runtime/index.js';
import { compile } from '../compile.js';
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
