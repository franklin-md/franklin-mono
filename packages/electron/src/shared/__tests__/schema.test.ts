import { describe, expect, it } from 'vitest';
import {
	isHandleDescriptor,
	isNamespaceDescriptor,
	isTransportDescriptor,
} from '@franklin/lib/proxy';

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
		expect(channels.getDuplexStreamChannel(['spawn'])).toBe(
			'franklin:spawn:stream',
		);
		expect(channels.getLeaseConnectChannel(['environment'])).toBe(
			'franklin:environment:connect',
		);
		expect(channels.getLeaseKillChannel(['environment'])).toBe(
			'franklin:environment:kill',
		);
		expect(
			channels.getLeaseMethodChannel(
				['environment'],
				['filesystem', 'readFile'],
			),
		).toBe('franklin:environment:lease:filesystem:readFile');
		expect(channels.getIpcStreamChannel()).toBe('franklin:ipc-stream');
	});

	it('captures environment and spawn as core resource descriptors', () => {
		const spawn = schema.shape['spawn'];
		const environment = schema.shape['environment'];
		expect(spawn).toBeDefined();
		expect(environment).toBeDefined();
		expect(isTransportDescriptor(spawn!)).toBe(true);
		expect(isHandleDescriptor(environment!)).toBe(true);
		expect(isNamespaceDescriptor(schema)).toBe(true);
	});
});
