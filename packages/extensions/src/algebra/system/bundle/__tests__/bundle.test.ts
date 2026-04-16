import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { createBundle } from '../create.js';
import { storeKey } from '../../../../systems/store/api/key.js';
import { toolSpec } from '../../../../systems/core/api/tool-spec.js';
import type { Extension } from '../../../types/extension.js';
import type { StoreKey } from '../../../../systems/store/api/key.js';
import type { ToolSpec } from '../../../../systems/core/api/tool-spec.js';

describe('createBundle', () => {
	const myKey = storeKey<'items', string[]>('items');
	const mySpec = toolSpec(
		'add_item',
		'Add an item',
		z.object({ text: z.string() }),
	);
	const ext: Extension = () => {};

	it('returns the config object unchanged (identity function)', () => {
		const config = {
			extension: ext,
			keys: { items: myKey },
			tools: { addItem: mySpec },
		};
		const bundle = createBundle(config);

		expect(bundle).toBe(config);
	});

	it('preserves key types through the bundle', () => {
		const bundle = createBundle({
			extension: ext,
			keys: { items: myKey },
			tools: {},
		});

		expectTypeOf(bundle.keys.items).toEqualTypeOf<
			StoreKey<'items', string[]>
		>();
	});

	it('preserves tool spec types through the bundle', () => {
		const bundle = createBundle({
			extension: ext,
			keys: {},
			tools: { addItem: mySpec },
		});

		expectTypeOf(bundle.tools.addItem).toEqualTypeOf<
			ToolSpec<'add_item', { text: string }>
		>();
	});

	it('works with empty keys and tools', () => {
		const bundle = createBundle({
			extension: ext,
			keys: {},
			tools: {},
		});

		expect(bundle.extension).toBe(ext);
		expect(bundle.keys).toEqual({});
		expect(bundle.tools).toEqual({});
	});
});
