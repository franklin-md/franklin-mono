import { describe, expect, it } from 'vitest';
import {
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';

import { schema } from '../schema.js';

describe('schema', () => {
	it('channel naming convention matches cursor-based runtime', () => {
		// The cursor-based runtime builds channels by concatenating
		// prefix:namespace:namespace for methods, appending :stream for streams,
		// and :connect/:kill for resources. Resource inner channels include the
		// lease id: prefix:lease:{id}:namespace.
		const prefix = 'franklin';

		// Top-level method
		expect(`${prefix}:filesystem:readFile`).toBe(
			'franklin:filesystem:readFile',
		);

		// Resource connect/kill
		expect(`${prefix}:spawn:connect`).toBe('franklin:spawn:connect');
		expect(`${prefix}:spawn:kill`).toBe('franklin:spawn:kill');

		// Direct stream
		expect(`${prefix}:spawn:stream`).toBe('franklin:spawn:stream');

		// Per-instance stream channel (id-scoped)
		const agentId = 'agent-1';
		expect(`${prefix}:spawn:lease:${agentId}:stream`).toBe(
			'franklin:spawn:lease:agent-1:stream',
		);

		// Resource inner method (id-scoped)
		const envId = 'env-1';
		expect(`${prefix}:environment:lease:${envId}:filesystem:readFile`).toBe(
			'franklin:environment:lease:env-1:filesystem:readFile',
		);
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
