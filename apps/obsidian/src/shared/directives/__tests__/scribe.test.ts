import { createMarkdownTestApp } from '../../obsidian/markdown/testing/app.js';
import { readMarkdown } from '../../obsidian/markdown/read.js';
import { describe, expect, it, vi } from 'vitest';
import { createDirectiveTestRegistry } from '../testing/registry.js';
import { DirectiveScribe } from '../scribe/operations.js';

describe('DirectiveScribe', () => {
	it('uses a newly opened buffer even when the saved file had no reference', async () => {
		const { app, open } = createMarkdownTestApp({
			'opening.md': 'disk has no directive',
		});
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({});
		vi.spyOn(app.vault, 'read').mockImplementationOnce(async () => {
			open('opening.md', `new edits ${instance.text}`);
			return 'disk has no directive';
		});
		expect(
			(await new DirectiveScribe(instance).replace('answer')).replacements,
		).toBe(1);
		expect(await readMarkdown(app, 'opening.md')).toBe('new edits answer');
		expect(app.vault.process).not.toHaveBeenCalled();
	});

	it('replaces every copy using current buffers and files', async () => {
		const { app, disk, open } = createMarkdownTestApp({
			'open.md': 'stale disk',
			'closed.md': '',
		});
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({ count: 0 });
		const scribe = new DirectiveScribe(instance);
		const editor = open(
			'open.md',
			'live edits ' + instance.text + instance.text,
		);
		disk.set('closed.md', instance.text + '\n\n`' + instance.text + '`');
		const result = await scribe.replace('answer');
		expect(editor.getValue()).toBe('live edits answeranswer');
		expect(disk.get('open.md')).toBe('stale disk');
		expect(disk.get('closed.md')).toBe('answer\n\n`' + instance.text + '`');
		expect(result).toEqual({
			replacements: 3,
			filesChanged: ['open.md', 'closed.md'],
			failures: [],
		});
		expect(instance.state.get()).toEqual({ count: 0 });
		expect((await scribe.replace('again')).replacements).toBe(0);
	});

	it('reports file failures and does not resurrect deleted references', async () => {
		const { app } = createMarkdownTestApp({ 'gone.md': '', 'denied.md': '' });
		vi.spyOn(app.vault, 'read').mockImplementation(async (file) => {
			if (file.path === 'denied.md') throw new Error('denied');
			return '';
		});
		const registry = await createDirectiveTestRegistry(app);
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({});
		const scribe = new DirectiveScribe(instance);
		expect(await scribe.replace('answer')).toEqual({
			replacements: 0,
			filesChanged: [],
			failures: [{ path: 'denied.md', error: 'denied' }],
		});
	});
});
