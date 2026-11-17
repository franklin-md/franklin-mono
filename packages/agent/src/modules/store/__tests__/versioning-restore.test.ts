import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createMapFilePersister,
	joinAbsolute,
	versioned,
	zodCodec,
} from '@franklin/lib';
import { z } from 'zod';
import { createSessionPersistence } from '../../../app/session/persistence.js';
import { createOrchestrator } from '../../orchestrator/index.js';
import { createStoreStateModule } from '../state-module.js';
import { createStoreFixture } from './fixture.js';

afterEach(() => vi.useRealTimers());

async function hydrateSession(failure: boolean) {
	const fixture = createStoreFixture(7);
	await fixture.storage.restore();
	const codec = versioned()
		.version(0, zodCodec(z.number()))
		.version(1, zodCodec(z.object({ count: z.number() })), (count) => {
			if (failure) throw new Error('conversion failed');
			return { count };
		})
		.build();
	const agents = createOrchestrator({
		modules: [createStoreStateModule(fixture.storage.stores)],
		extensions: [
			(api) => api.registerStore('counter', { count: 0 }, 'shared', codec),
		],
	});
	const observed: unknown[] = [];
	agents.subscribe((event) => {
		if (event.action === 'add')
			observed.push(event.runtime.getStore('counter').get());
	});
	const sessionCodec = versioned()
		.version(
			1,
			zodCodec(
				z.object({
					store: z.record(z.string(), z.string()),
					details: z.object({ visibility: z.enum(['visible', 'hidden']) }),
				}),
			),
		)
		.build();
	const sessions = createMapFilePersister(
		fixture.fs,
		joinAbsolute(fixture.appDir, 'sessions'),
		sessionCodec,
	);
	await sessions.save('root', {
		store: { counter: fixture.ref },
		details: { visibility: 'visible' },
	});
	const path = joinAbsolute(fixture.appDir, 'sessions', 'root.json');
	const originalSession = await fixture.fs.readFile(path);
	const persistence = createSessionPersistence({
		source: agents,
		persistedSessions: sessions,
		observeSessionChanges: () => () => {},
	});
	try {
		const result = await persistence.restore();
		return { fixture, result, agents, observed, path, originalSession };
	} finally {
		persistence.dispose();
		await Promise.all(agents.list().map((entry) => entry.runtime.dispose()));
	}
}

describe('versioned stores during session hydration', () => {
	it('publishes only upgraded values to runtime observers', async () => {
		const { result, observed, agents } = await hydrateSession(false);
		expect(result.issues).toEqual([]);
		expect(observed).toEqual([{ count: 7 }]);
		expect(agents.get('root')?.runtime.getStore('counter').get()).toEqual({
			count: 7,
		});
	});

	it('reports failed hydration and preserves both the store and session files', async () => {
		vi.useFakeTimers();
		const { result, observed, agents, fixture, path, originalSession } =
			await hydrateSession(true);
		expect(result.issues).toEqual([
			expect.objectContaining({
				kind: 'hydrate-failed',
				id: 'root',
				error: expect.stringContaining(
					`Store "counter" (ref "${fixture.ref}")`,
				),
			}),
		]);
		expect(result.issues[0]).toHaveProperty(
			'error',
			expect.stringContaining('conversion failed'),
		);
		expect(agents.list()).toEqual([]);
		expect(observed).toEqual([]);
		await vi.runAllTimersAsync();
		expect(await fixture.read()).toBe(fixture.original);
		expect(await fixture.fs.readFile(path)).toEqual(originalSession);
	});
});
