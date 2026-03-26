import { describe, expect, it } from 'vitest';

import { isHandleDescriptor } from '../descriptors/detect.js';
import { createChannels } from '../channels.js';
import { schema } from '../schema.js';

describe('schema', () => {
	it('derives stable channel names from key paths', () => {
		const channels = createChannels('franklin');

		expect(channels.getMethodChannel(['filesystem', 'readFile'])).toBe(
			'franklin:filesystem:readFile',
		);
		expect(channels.getLeaseConnectChannel(['spawn'])).toBe(
			'franklin:spawn:connect',
		);
		expect(channels.getLeaseKillChannel(['spawn'])).toBe('franklin:spawn:kill');
		expect(channels.getTransportStreamChannel(['spawn'])).toBe(
			'franklin:spawn:stream',
		);
		expect(channels.getLeaseConnectChannel(['environment'])).toBe(
			'franklin:environment:connect',
		);
		expect(channels.getLeaseKillChannel(['environment'])).toBe(
			'franklin:environment:kill',
		);
		expect(
			channels.getHandleMethodChannel(
				['environment'],
				['filesystem', 'readFile'],
			),
		).toBe('franklin:environment:handle:filesystem:readFile');
		expect(channels.getIpcStreamChannel()).toBe('franklin:ipc-stream');
	});

	it('captures environment as a handle descriptor', () => {
		const environment = schema.shape['environment'];
		expect(environment).toBeDefined();
		expect(isHandleDescriptor(environment!)).toBe(true);
	});
});
