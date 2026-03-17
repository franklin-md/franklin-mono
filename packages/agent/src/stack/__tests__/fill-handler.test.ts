import { RequestError } from '@agentclientprotocol/sdk';
import { describe, expect, it, vi } from 'vitest';

import { NOTIFICATION_METHODS } from '../../middleware/types.js';
import { fillHandler } from '../fill-handler.js';

describe('fillHandler', () => {
	it('notification methods return void without throwing', async () => {
		const filled = fillHandler({});

		for (const method of NOTIFICATION_METHODS) {
			const fn = filled[method as keyof typeof filled] as (
				params: never,
			) => Promise<void>;
			await expect(fn({} as never)).resolves.toBeUndefined();
		}
	});

	it('request methods throw methodNotFound', async () => {
		const filled = fillHandler({});

		await expect(
			filled.readTextFile({ path: '/tmp/test' } as never),
		).rejects.toThrow(RequestError);
	});

	it('provided methods are preserved', async () => {
		const custom = vi.fn(async () => {});
		const filled = fillHandler({ sessionUpdate: custom });

		await filled.sessionUpdate({} as never);

		expect(custom).toHaveBeenCalledOnce();
	});
});
