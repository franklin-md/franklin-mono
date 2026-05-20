import { describe, expect, it } from 'vitest';

import { toToolInputSchema } from '../../../modules/core/compile/tools/index.js';
import { readPDFSpec } from '../tools.js';

describe('readPDFSpec', () => {
	it('serializes page range boundaries as optional numbers', () => {
		const schema = toToolInputSchema(readPDFSpec.schema);

		expect(schema).toMatchObject({
			properties: {
				start_page: { type: 'integer' },
				end_page: { type: 'integer' },
			},
		});
		expect(schema).toMatchObject({ required: ['path'] });
	});
});
