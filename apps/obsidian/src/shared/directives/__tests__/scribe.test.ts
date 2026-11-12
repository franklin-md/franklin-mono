import type { App, Editor, MarkdownView, TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from '../testing/persistence.js';
import { DirectiveScribe } from '../scribe/operations.js';

describe('DirectiveScribe', () => {
	it('uses a newly opened buffer even when the saved file had no reference', async () => {
		const file = { path: 'opening.md', extension: 'md' } as TFile;
		let open = false;
		let text = '';
		const transaction = vi.fn();
		const app = {
			workspace: {
				iterateAllLeaves: (visit: (leaf: unknown) => void) => {
					if (open)
						visit({
							view: {
								getViewType: () => 'markdown',
								getMode: () => 'source',
								file,
								editor: {
									getValue: () => text,
									offsetToPos: (ch: number) => ({ line: 0, ch }),
									transaction,
								},
							},
						});
				},
			},
			vault: {
				getMarkdownFiles: () => [file],
				getFileByPath: () => file,
				read: async () => {
					open = true;
					return 'disk has no directive';
				},
				process: vi.fn(),
			},
		} as unknown as App;
		const registry = await DirectiveRegistry.create({
			app,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({});
		text = `new edits ${instance.text}`;
		expect(
			(await new DirectiveScribe(instance).replace('answer')).replacements,
		).toBe(1);
		expect(transaction).toHaveBeenCalledOnce();
		expect(app.vault.process).not.toHaveBeenCalled();
	});

	it('inserts at the cursor and replaces every copy using current buffers and files', async () => {
		const a = { path: 'open.md', extension: 'md' } as TFile;
		const b = { path: 'closed.md', extension: 'md' } as TFile;
		let current = 'live edits ';
		const disk = new Map([
			[a.path, 'stale disk'],
			[b.path, ''],
		]);
		const editor = {
			getValue: () => current,
			getCursor: () => ({ line: 0, ch: current.length }),
			offsetToPos: (ch: number) => ({ line: 0, ch }),
			transaction: vi.fn(
				(tx: {
					changes: {
						from: { ch: number };
						to?: { ch: number };
						text: string;
					}[];
				}) => {
					for (const change of [...tx.changes].reverse())
						current =
							current.slice(0, change.from.ch) +
							change.text +
							current.slice(change.to?.ch ?? change.from.ch);
				},
			),
		} as unknown as Editor;
		const view = {
			file: a,
			editor,
			getViewType: () => 'markdown',
			getMode: () => 'source',
		} as MarkdownView;
		const app = {
			workspace: {
				activeEditor: { file: a, editor },
				iterateAllLeaves: (visit: (leaf: unknown) => void) => {
					visit({ view });
					visit({ view });
				},
			},
			vault: {
				getMarkdownFiles: () => [a, b],
				getFileByPath: (path: string) =>
					[a, b].find((file) => file.path === path) ?? null,
				read: (file: TFile) => Promise.resolve(disk.get(file.path)!),
				process: vi.fn(
					async (file: TFile, change: (value: string) => string) => {
						const next = change(disk.get(file.path)!);
						disk.set(file.path, next);
						return next;
					},
				),
			},
		} as unknown as App;
		const registry = await DirectiveRegistry.create({
			app,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({ count: 0 });
		const scribe = new DirectiveScribe(instance);
		await scribe.write();
		expect(current).toBe(`live edits ${instance.text}`);
		current += instance.text;
		disk.set(b.path, `${instance.text}\n\n\`${instance.text}\``);
		const result = await scribe.replace('answer');
		expect(current).toBe('live edits answeranswer');
		expect(disk.get(a.path)).toBe('stale disk');
		expect(disk.get(b.path)).toBe(`answer\n\n\`${instance.text}\``);
		expect(result).toEqual({
			replacements: 3,
			filesChanged: ['open.md', 'closed.md'],
			failures: [],
		});
		expect(instance.state.get()).toEqual({ count: 0 });
		expect((await scribe.replace('again')).replacements).toBe(0);
	});

	it('reports file failures and does not resurrect deleted references', async () => {
		const files = ['gone.md', 'denied.md'].map(
			(path) => ({ path, extension: 'md' }) as TFile,
		);
		const app = {
			workspace: { activeEditor: null, iterateAllLeaves: () => {} },
			vault: {
				getMarkdownFiles: () => files,
				getFileByPath: (path: string) =>
					files.find((file) => file.path === path) ?? null,
				read: (file: TFile) =>
					file.path === 'gone.md'
						? Promise.resolve('deleted')
						: Promise.reject(new Error('denied')),
			},
		} as unknown as App;
		const registry = await DirectiveRegistry.create({
			app,
			persistence: createDirectiveTestPersistence(),
		});
		const instance = await registry
			.registerDirective('counter', () => null)
			.create({});
		const scribe = new DirectiveScribe(instance);
		await expect(scribe.write()).rejects.toThrow('editor');
		expect(await scribe.replace('answer')).toEqual({
			replacements: 0,
			filesChanged: [],
			failures: [{ path: 'denied.md', error: 'denied' }],
		});
	});
});
