import { describe, expect, it } from 'vitest';

import {
	isHandleDescriptor,
	isMethodDescriptor,
	isProxyDescriptor,
} from '../descriptors/detect.js';
import { serializeProxy, deserializeProxy } from '../descriptors/serde.js';
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

	it('serializes and deserializes proxy return values via ResultShape', async () => {
		const filesystem = schema.shape['filesystem'];
		if (!filesystem || !isProxyDescriptor(filesystem)) {
			throw new Error('filesystem descriptor missing');
		}

		const stat = filesystem.shape['stat'];
		if (!stat || !isMethodDescriptor(stat) || !stat.returns) {
			throw new Error('stat descriptor is missing returns shape');
		}

		const serialized = await serializeProxy(
			{ isFile: () => true, isDirectory: () => false },
			stat.returns,
		);
		expect(serialized).toEqual({
			isFile: true,
			isDirectory: false,
		});

		const deserialized = deserializeProxy(serialized, stat.returns) as {
			isFile: () => boolean;
			isDirectory: () => boolean;
		};
		expect(deserialized.isFile()).toBe(true);
		expect(deserialized.isDirectory()).toBe(false);
	});
});
