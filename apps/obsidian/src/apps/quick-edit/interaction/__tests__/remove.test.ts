import { describe, expect, it, vi } from 'vitest';
import { createMarkdownTestApp } from '../../../../shared/obsidian/markdown/testing/app.js';
import { createDirectiveTestRegistry } from '../../../../shared/directives/testing/registry.js';
import type { DiffClient } from '../../../../shared/diff/client.js';
import type { QuickEditState } from '../../types.js';
import { removeQuickEdit } from '../remove.js';

async function setup() {
	const { app, disk } = createMarkdownTestApp({ 'note.md': '' });
	const registry = await createDirectiveTestRegistry(app);
	const instance = await registry
		.registerDirective<QuickEditState>('quick-edit', () => null)
		.create({
			path: 'note.md',
			line: 0,
			selection: '',
			prompt: 'Improve.',
			status: 'done',
			error: '',
		});
	return { app, disk, registry, instance };
}

describe('cleanup after the originating editor closes', () => {
	it('updates the live note and its cached baseline independently after relocation', async () => {
		const { disk, registry, instance } = await setup();
		disk.set('note.md', `first\n${instance.text}\nlast`);
		const setBaseline = vi.fn(async () => {});
		const diff = {
			getEntry: async () => ({
				path: 'note.md',
				oldContent: `first ${instance.text} prose\nlast`,
				isNewFile: false,
			}),
			setBaseline,
		} as unknown as DiffClient;
		await removeQuickEdit(instance, diff);
		expect(disk.get('note.md')).toBe('first\nlast');
		expect(setBaseline).toHaveBeenCalledExactlyOnceWith(
			'note.md',
			'first  prose\nlast',
		);
		await registry.dispose();
	});

	it('does not guess at duplicate controls or modify the note on cleanup failure', async () => {
		const { disk, registry, instance } = await setup();
		const source = `prose\n${instance.text}\n${instance.text}`;
		disk.set('note.md', source);
		const setBaseline = vi.fn(async () => {});
		const diff = {
			getEntry: async () => null,
			setBaseline,
		} as unknown as DiffClient;
		await expect(removeQuickEdit(instance, diff)).rejects.toThrow(
			'exactly one',
		);
		expect(disk.get('note.md')).toBe(source);
		expect(setBaseline).not.toHaveBeenCalled();
		await registry.dispose();
	});
});
