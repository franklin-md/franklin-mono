import { describe, expect, it, vi } from 'vitest';
import { DirectiveScribe } from '../scribe/operations.js';
import { createDirectiveTestRegistry } from '../testing/registry.js';
import { createMarkdownTestApp } from '../../obsidian/markdown/testing/app.js';

describe('directive discovery and scoped replacement', () => {
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

	it('replaces only the originating note and recalculates offsets after discovery', async () => {
		const { app, disk, open } = createMarkdownTestApp({
			'origin.md': '',
			'copy.md': '',
		});
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('test', () => null)
			.create({});
		disk.set('origin.md', instance.text);
		disk.set('copy.md', instance.text);
		const scribe = new DirectiveScribe(instance);
		expect((await scribe.find()).locations).toHaveLength(2);
		const editor = open('origin.md', `user added\n${instance.text}`);
		expect(await scribe.replaceOne('origin.md', 'done')).toEqual({
			replacements: 1,
			filesChanged: ['origin.md'],
			failures: [],
		});
		expect(editor.getValue()).toBe('user added\ndone');
		expect(disk.get('copy.md')).toBe(instance.text);
	});

	it('reports absent, deleted and duplicated targets without changing them', async () => {
		const { app, disk } = createMarkdownTestApp({ 'origin.md': '' });
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('test', () => null)
			.create({});
		const scribe = new DirectiveScribe(instance);
		for (const content of ['deleted', instance.text + instance.text]) {
			disk.set('origin.md', content);
			const result = await scribe.replaceOne('origin.md', 'answer');
			expect(result.replacements).toBe(0);
			expect(result.filesChanged).toEqual([]);
			expect(result.failures).toHaveLength(1);
			expect(result.failures[0]?.error).toContain('exactly one');
			expect(disk.get('origin.md')).toBe(content);
		}
		expect((await scribe.replaceOne('missing.md', '')).failures).toHaveLength(
			1,
		);
	});

	it('rechecks uniqueness inside the closed-note update', async () => {
		const { app, disk } = createMarkdownTestApp({ 'origin.md': '' });
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('test', () => null)
			.create({});
		disk.set('origin.md', instance.text);
		const process = app.vault.process;
		vi.spyOn(app.vault, 'process').mockImplementationOnce((file, plan) => {
			disk.set('origin.md', instance.text + instance.text);
			return process(file, plan);
		});
		const result = await new DirectiveScribe(instance).replaceOne(
			'origin.md',
			'answer',
		);
		expect(result.replacements).toBe(0);
		expect(result.failures).toHaveLength(1);
		expect(disk.get('origin.md')).toBe(instance.text + instance.text);
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
		await expect(scribe.replaceOne('note.md', '')).rejects.toThrow('closed');
	});
});
