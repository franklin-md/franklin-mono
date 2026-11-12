import { describe, expect, it, vi } from 'vitest';
import { editMarkdown } from '../edit.js';
import { readMarkdown } from '../read.js';
import { createMarkdownTestApp } from '../testing/app.js';

describe('Markdown note operations', () => {
	it('edits the live buffer in one transaction and maps the cursor', async () => {
		const { app, disk, open } = createMarkdownTestApp({ 'note.md': 'disk' });
		const editor = open('note.md', 'one\ntwo');
		editor.setSelection({ line: 1, ch: 3 });
		expect(
			await editMarkdown(app, 'note.md', () => [
				{ from: 4, to: 7, text: 'second' },
				{ from: 0, to: 3, text: 'first' },
			]),
		).toBe(2);
		expect(editor.getValue()).toBe('first\nsecond');
		expect(editor.getCursor()).toEqual({ line: 1, ch: 6 });
		expect(editor.transaction).toHaveBeenCalledOnce();
		expect(disk.get('note.md')).toBe('disk');
		expect(app.vault.process).not.toHaveBeenCalled();
	});

	it('plans closed-note edits against the contents inside Vault.process', async () => {
		const { app, disk } = createMarkdownTestApp({ 'note.md': 'target' });
		const process = app.vault.process;
		vi.spyOn(app.vault, 'process').mockImplementationOnce((file, plan) => {
			disk.set('note.md', 'user added\ntarget');
			return process(file, plan);
		});
		await editMarkdown(app, 'note.md', (source) => {
			const from = source.indexOf('target');
			return [{ from, to: from + 6, text: 'answer' }];
		});
		expect(disk.get('note.md')).toBe('user added\nanswer');
	});

	it('prefers a buffer opened while the initial read was pending', async () => {
		const { app, disk, open } = createMarkdownTestApp({ 'note.md': 'disk' });
		let editor: ReturnType<typeof open> | undefined;
		vi.spyOn(app.vault, 'read').mockImplementationOnce(async () => {
			editor = open('note.md', 'live');
			return 'disk';
		});
		await editMarkdown(app, 'note.md', (source) => [
			{ from: source.length, to: source.length, text: '!' },
		]);
		expect(editor?.getValue()).toBe('live!');
		expect(disk.get('note.md')).toBe('disk');
	});

	it('uses a buffer opened before the Vault.process callback runs', async () => {
		const { app, disk, open } = createMarkdownTestApp({ 'note.md': 'disk' });
		const process = app.vault.process;
		let editor: ReturnType<typeof open> | undefined;
		vi.spyOn(app.vault, 'process').mockImplementationOnce((file, plan) => {
			editor = open('note.md', 'live');
			return process(file, plan);
		});
		await editMarkdown(app, 'note.md', (source) => [
			{ from: source.length, to: source.length, text: '!' },
		]);
		expect(editor?.getValue()).toBe('live!');
		expect(disk.get('note.md')).toBe('disk');
	});

	it('does not write when no edits are needed', async () => {
		const { app } = createMarkdownTestApp({ 'note.md': 'unchanged' });
		expect(await editMarkdown(app, 'note.md', () => [])).toBe(0);
		expect(app.vault.process).not.toHaveBeenCalled();
	});

	it.each([
		[{ from: -1, to: 2, text: '' }],
		[{ from: 0, to: 20, text: '' }],
		[{ from: 2, to: 1, text: '' }],
		[{ from: 0.5, to: 1, text: '' }],
		[
			{ from: 0, to: 3, text: '' },
			{ from: 2, to: 4, text: '' },
		],
		[
			{ from: 1, to: 1, text: 'a' },
			{ from: 1, to: 1, text: 'b' },
		],
	])(
		'rejects invalid or overlapping edits before changing a note: %j',
		async (...edits) => {
			const { app, disk, open } = createMarkdownTestApp({ 'note.md': 'text' });
			await expect(editMarkdown(app, 'note.md', () => edits)).rejects.toThrow();
			expect(disk.get('note.md')).toBe('text');
			const editor = open('note.md');
			await expect(editMarkdown(app, 'note.md', () => edits)).rejects.toThrow();
			expect(editor.getValue()).toBe('text');
			expect(editor.transaction).not.toHaveBeenCalled();
		},
	);

	it('rejects missing or non-Markdown notes without creating files', async () => {
		const { app, disk } = createMarkdownTestApp({ 'data.json': '{}' });
		for (const path of ['missing.md', 'data.json'])
			await expect(editMarkdown(app, path, () => [])).rejects.toThrow();
		expect([...disk]).toEqual([['data.json', '{}']]);
	});

	it('reads live buffers and falls back to disk for closed notes', async () => {
		const { app, open } = createMarkdownTestApp({ 'note.md': 'disk' });
		expect(await readMarkdown(app, 'note.md')).toBe('disk');
		open('note.md', 'live');
		expect(await readMarkdown(app, 'note.md')).toBe('live');
	});
});
