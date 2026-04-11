import { describe, expect, it } from 'vitest';
import {
	isNamespaceDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '@franklin/lib/proxy';

import { createScope } from '../channels.js';
import { schema } from '../schema.js';

describe('schema', () => {
	it('derives stable channel names from key paths', () => {
		const scope = createScope('franklin');

		expect(scope.method(['filesystem', 'readFile'])).toBe(
			'franklin:filesystem:readFile',
		);

		const spawn = scope.resource(['spawn']);
		expect(spawn.connect).toBe('franklin:spawn:connect');
		expect(spawn.kill).toBe('franklin:spawn:kill');
		expect(scope.stream(['spawn'])).toBe('franklin:spawn:stream');

		const spawnInner = spawn.inner();
		// Per-instance stream channel is computed by convention: stream + ':' + id
		expect(`${spawnInner.stream([])}:agent-1`).toBe(
			'franklin:spawn:lease:stream:agent-1',
		);

		const env = scope.resource(['environment']);
		expect(env.connect).toBe('franklin:environment:connect');
		expect(env.kill).toBe('franklin:environment:kill');

		const envInner = env.inner();
		expect(envInner.method(['filesystem', 'readFile'])).toBe(
			'franklin:environment:lease:filesystem:readFile',
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
