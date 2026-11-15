import { describe, expect, it, vi } from 'vitest';
import { DirectiveScribe } from '../scribe/operations.js';
import { createDirectiveTestRegistry } from '../testing/registry.js';
import { createMarkdownTestApp } from '../../obsidian/markdown/testing/app.js';

describe('directive discovery', () => {
	it('finds current occurrences once per note, excludes examples, and reports read failures', async () => {
		const { app, disk, open } = createMarkdownTestApp({
			'open.md': 'stale disk',
			'closed.md': '',
			'denied.md': '',
		});
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('test', () => null)
			.create({});
		const other = await registry
			.registerDirective('other', () => null)
			.create({});
		open('open.md', `live ${instance.text}`);
		const iterate = app.workspace.iterateAllLeaves;
		vi.spyOn(app.workspace, 'iterateAllLeaves').mockImplementation((visit) => {
			iterate(visit);
			iterate(visit);
		});
		disk.set(
			'closed.md',
			`${instance.text}\n\`${instance.text}\`\n${other.text}`,
		);
		vi.spyOn(app.vault, 'read').mockImplementation((file) => {
			if (file.path === 'denied.md') return Promise.reject(new Error('denied'));
			return Promise.resolve(disk.get(file.path)!);
		});
		const result = await new DirectiveScribe(instance).find();
		expect(result).toEqual({
			locations: [
				{ path: 'open.md', from: 5, to: 5 + instance.text.length },
				{ path: 'closed.md', from: 0, to: instance.text.length },
			],
			failures: [{ path: 'denied.md', error: 'denied' }],
		});
		expect(app.vault.process).not.toHaveBeenCalled();
	});

	it('returns an empty discovery and rejects operations after disposal', async () => {
		const { app } = createMarkdownTestApp({ 'note.md': 'no directive' });
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('test', () => null)
			.create({});
		const scribe = new DirectiveScribe(instance);
		expect(await scribe.find()).toEqual({ locations: [], failures: [] });
		await registry.dispose();
		await expect(scribe.find()).rejects.toThrow('closed');
		await expect(scribe.replace('')).rejects.toThrow('closed');
	});
});
