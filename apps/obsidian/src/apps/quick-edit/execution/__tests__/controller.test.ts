import { describe, expect, it, vi } from 'vitest';
import { createDirectiveTestRegistry } from '../../../../shared/directives/testing/registry.js';
import { createMarkdownTestApp } from '../../../../shared/obsidian/markdown/testing/app.js';
import { QuickEditController } from '../controller.js';
import type { QuickEditState } from '../../types.js';

async function setup(run = vi.fn(async () => {})) {
	const { app, disk } = createMarkdownTestApp({ 'note.md': '' });
	const registry = await createDirectiveTestRegistry(app);
	const definition = registry.registerDirective<QuickEditState>(
		'quick-edit',
		() => null,
	);
	const instance = await definition.create({
		path: 'note.md',
		line: 2,
		selection: '',
		prompt: '',
		status: 'ready',
		error: '',
	});
	disk.set('note.md', instance.text);
	const controller = new QuickEditController({
		definition,
		run,
		getSettings: () => ({
			provider: 'test',
			model: 'test',
			reasoning: 'low',
			instructions: 'Preserve outlines.',
			presets: [],
		}),
	});
	return { controller, instance, disk, run, definition };
}

describe('quick edit execution', () => {
	it('records completion while the interaction owns editor cleanup', async () => {
		const h = await setup();
		await h.controller.execute(h.instance.id, 'add a bullet below');
		expect(h.run).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				state: expect.objectContaining({
					prompt: 'add a bullet below',
					line: 2,
				}),
				settings: expect.objectContaining({
					instructions: 'Preserve outlines.',
					presets: [],
				}),
			}),
		);
		expect(h.instance.state.get().status).toBe('done');
		expect(h.disk.get('note.md')).toBe(h.instance.text);
	});

	it('refuses ambiguous references and preserves the prompt for amendment', async () => {
		const h = await setup();
		h.disk.set('note.md', h.instance.text + h.instance.text);
		await h.controller.execute(h.instance.id, 'fix');
		expect(h.run).not.toHaveBeenCalled();
		expect(h.instance.state.get()).toMatchObject({
			status: 'failed',
			prompt: 'fix',
		});
	});

	it('allows one active run and records cancellation even if the runner finishes normally', async () => {
		let finish: (() => void) | undefined;
		const run = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const h = await setup(run);
		const pending = h.controller.execute(h.instance.id, 'fix');
		await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
		await expect(h.controller.execute(h.instance.id, 'again')).rejects.toThrow(
			'already running',
		);
		h.controller.stop();
		finish?.();
		await pending;
		expect(h.instance.state.get().status).toBe('stopped');
	});

	it('restores interrupted requests without executing them', async () => {
		const h = await setup();
		await h.instance.update((state) => {
			state.status = 'running';
		});
		await h.controller.restore();
		expect(h.instance.state.get().status).toBe('stopped');
		expect(h.run).not.toHaveBeenCalled();
	});
});
