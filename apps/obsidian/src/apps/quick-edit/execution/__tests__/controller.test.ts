import { describe, expect, it, vi } from 'vitest';
import { createDirectiveTestRegistry } from '../../../../shared/directives/testing/registry.js';
import { createMarkdownTestApp } from '../../../../shared/obsidian/markdown/testing/app.js';
import { QuickEditController } from '../controller.js';
import type { QuickEditState } from '../../types.js';
import { createDirectiveTestPersistence } from '../../../../shared/directives/testing/persistence.js';

async function setup(run = vi.fn(async () => {})) {
	const { app, disk } = createMarkdownTestApp({
		'note.md': '',
		'other.md': '',
	});
	const persistence = createDirectiveTestPersistence();
	const registry = await createDirectiveTestRegistry(app, persistence);
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
	return {
		controller,
		instance,
		disk,
		run,
		definition,
		app,
		registry,
		persistence,
	};
}

describe('quick edit execution', () => {
	it('records completion while the interaction owns editor cleanup', async () => {
		const h = await setup();
		await h.controller.execute(h.instance.id, 'add a bullet below');
		expect(h.run).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				directive: h.instance.text,
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

	it.each(['missing', 'duplicate', 'other-note'])(
		'refuses successful completion when the agent leaves %s controls',
		async (kind) => {
			const h = await setup();
			h.run.mockImplementationOnce(async () => {
				h.disk.set(
					'note.md',
					kind === 'duplicate' ? h.instance.text.repeat(2) : 'edited content',
				);
				if (kind === 'other-note') h.disk.set('other.md', h.instance.text);
			});
			await h.controller.execute(h.instance.id, 'fix');
			expect(h.instance.state.get()).toMatchObject({
				status: 'failed',
				prompt: 'fix',
			});
			expect(h.instance.state.get().error).toContain('exactly one directive');
		},
	);

	it('preserves the exact runtime explanation through restoration and permits retry', async () => {
		const h = await setup();
		const explanation =
			'Could not read Note.md.\nPermission denied: additional detail.';
		h.run.mockRejectedValueOnce(new Error(explanation));
		await h.controller.execute(h.instance.id, 'fix');
		await h.controller.restore();
		expect(h.instance.state.get()).toMatchObject({
			status: 'failed',
			prompt: 'fix',
			error: explanation,
		});
		await h.controller.execute(h.instance.id, 'fix');
		expect(h.instance.state.get()).toMatchObject({ status: 'done', error: '' });
		await h.controller.restore();
		await expect(h.controller.execute(h.instance.id, 'again')).rejects.toThrow(
			'complete',
		);
		expect(h.run).toHaveBeenCalledTimes(2);
	});

	it('refuses ambiguous references and preserves the prompt for retry', async () => {
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
		h.run.mockResolvedValueOnce(undefined);
		await h.controller.execute(h.instance.id, 'retry');
		expect(h.instance.state.get().status).toBe('done');
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

	it.each(['done', 'failed'] as const)(
		'keeps %s execution state through a registry reload',
		async (status) => {
			const h = await setup();
			const reason =
				'The request needs more context.\nPlease specify a subject.';
			if (status === 'failed') h.run.mockRejectedValueOnce(new Error(reason));
			await h.controller.execute(h.instance.id, 'edit');
			await h.registry.dispose();
			const restoredRegistry = await createDirectiveTestRegistry(
				h.app,
				h.persistence,
			);
			const definition = restoredRegistry.registerDirective<QuickEditState>(
				'quick-edit',
				() => null,
			);
			const run = vi.fn(async () => {});
			const restored = new QuickEditController({
				definition,
				run,
				getSettings: () => {
					throw new Error('Restoration must not start a run');
				},
			});
			await restored.restore();
			expect(definition.get(h.instance.id)?.state.get()).toMatchObject({
				status,
				prompt: 'edit',
				error: status === 'failed' ? reason : '',
			});
			expect(run).not.toHaveBeenCalled();
			await restored.dispose();
			await restoredRegistry.dispose();
		},
	);
});
