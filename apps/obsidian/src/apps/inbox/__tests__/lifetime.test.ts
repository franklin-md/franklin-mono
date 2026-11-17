import { toAbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import { expect, it, vi } from 'vitest';
import { openInbox } from '../lifetime.js';
import { createInboxTestPersistence } from '../testing/persistence.js';

const path = toAbsolutePath('/vault/plugin/inbox.json');
const defaults = { provider: 'test', model: 'test', reasoning: 'off' as const };

it('waits to restore until the previous plugin bundle has finished writing', async () => {
	const app = {} as App;
	const { disk, read } = createInboxTestPersistence();
	const options = { defaults, persistence: disk, run: vi.fn() };
	const original = openInbox(app, path, options);
	const first = await original.ready;
	await first.configure({ answerInstructions: 'Saved before reload' });
	const load = vi.spyOn(disk, 'load');
	const saved = Promise.withResolvers<undefined>();
	const release = Promise.withResolvers<undefined>();
	const save = disk.save;
	vi.spyOn(disk, 'save').mockImplementationOnce(async (document) => {
		saved.resolve(undefined);
		await release.promise;
		await save(document);
	});

	const closing = original.dispose();
	await saved.promise;
	vi.resetModules();
	const { openInbox: reopenInbox } = await import('../lifetime.js');
	const reloaded = reopenInbox(app, path, options);
	try {
		expect(reopenInbox).not.toBe(openInbox);
		await Promise.resolve();
		expect(load).not.toHaveBeenCalled();
	} finally {
		release.resolve(undefined);
		await closing;
	}

	const current = await reloaded.ready;
	expect(current.state.get().preferences.answerInstructions).toBe(
		'Saved before reload',
	);
	await current.configure({ answerInstructions: 'Saved after reload' });
	expect(read()?.preferences.answerInstructions).toBe('Saved after reload');
	await reloaded.dispose();
});

it('skips writes when unloaded while the file is being restored', async () => {
	const { disk } = createInboxTestPersistence();
	const reading = Promise.withResolvers<undefined>();
	const release = Promise.withResolvers<undefined>();
	const load = disk.load;
	vi.spyOn(disk, 'load').mockImplementationOnce(async () => {
		reading.resolve(undefined);
		await release.promise;
		return load();
	});
	const save = vi.spyOn(disk, 'save');
	const run = vi.fn();
	const lifetime = openInbox({} as App, path, {
		defaults,
		persistence: disk,
		run,
	});
	await reading.promise;
	const closing = lifetime.dispose();
	release.resolve(undefined);
	await closing;

	await expect(lifetime.ready).rejects.toMatchObject({ name: 'AbortError' });
	expect(save).not.toHaveBeenCalled();
	expect(run).not.toHaveBeenCalled();
});
