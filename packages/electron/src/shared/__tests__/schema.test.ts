import { describe, expect, it } from 'vitest';
import {
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
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
		expect(channels.getStreamChannel(['spawn'])).toBe('franklin:spawn:stream');
		expect(channels.getLeaseStreamChannel(['spawn'], 'agent-1')).toBe(
			'franklin:spawn:lease:agent-1:stream',
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
	});

	it('captures environment and spawn as core resource descriptors', () => {
		const spawn = schema.shape.spawn;
		const environment = schema.shape.environment;
		expect(spawn).toBeDefined();
		expect(environment).toBeDefined();
		expect(isResourceDescriptor(spawn) && isStreamDescriptor(spawn.inner)).toBe(
			true,
		);
		expect(
			isResourceDescriptor(environment) &&
				isNamespaceDescriptor(environment.inner),
		).toBe(true);
		expect(isNamespaceDescriptor(schema)).toBe(true);
	});
});
