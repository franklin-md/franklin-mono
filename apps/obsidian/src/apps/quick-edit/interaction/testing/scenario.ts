import { StateEffect } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { editorLivePreviewField } from 'obsidian';
import type { App } from 'obsidian';
import { vi } from 'vitest';
import { createDirectiveTestEditor } from '../../../../shared/directives/testing/editor.js';
import { createDirectiveTestRegistry } from '../../../../shared/directives/testing/registry.js';
import { createDirectiveTestPersistence } from '../../../../shared/directives/testing/persistence.js';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';
import { diffInverted } from '../../../../shared/diff/cm/inverted.js';
import { QuickEditController } from '../../execution/controller.js';
import type { QuickEditRunner, QuickEditState } from '../../types.js';
import { QuickEditInteraction } from '../composer.js';
import { quickEditExtension } from '../extension.js';

export async function createQuickEditScenario(
	source: string,
	runner?: QuickEditRunner,
) {
	const target = createDirectiveTestEditor(source);
	Object.assign(target.info.file ?? {}, { extension: 'md' });
	document.body.append(target.cm.dom);
	let disk = source;
	const save = vi.fn(async () => {
		disk = target.editor.getValue();
	});
	const note = {
		...target.info,
		getViewType: () => 'markdown',
		getMode: () => 'source',
		save,
	};
	const app = {
		workspace: {
			iterateAllLeaves: (visit: (leaf: unknown) => void) =>
				visit({ view: note }),
		},
		vault: {
			getFileByPath: (path: string) =>
				path === target.info.file?.path ? target.info.file : null,
			getMarkdownFiles: () => [target.info.file],
			read: async () => disk,
		},
	} as unknown as App;
	const persistence = createDirectiveTestPersistence();
	const registry = await createDirectiveTestRegistry(app, persistence);
	const definition = registry.registerDirective<QuickEditState>(
		'quick-edit',
		() => null,
	);
	const run = vi.fn(runner ?? (async () => {}));
	const execution = new QuickEditController({
		definition,
		run,
		getSettings: () => ({
			provider: 'test',
			model: 'test',
			reasoning: 'low',
			instructions: '',
		}),
	});
	const report = vi.fn();
	const interaction = new QuickEditInteraction({
		app,
		definition,
		execution,
		report,
	});
	target.cm.dispatch({
		effects: StateEffect.appendConfig.of([
			editorLivePreviewField,
			diffField,
			diffInverted,
			history(),
			quickEditExtension({
				submit: (view) => interaction.submit(view),
				cancel: (view) => interaction.cancel(view),
			}),
		]),
	});
	return {
		...target,
		app,
		registry,
		definition,
		run,
		execution,
		interaction,
		report,
		save,
		persistence,
		get disk() {
			return disk;
		},
		type: (text: string) =>
			target.cm.dispatch(target.cm.state.replaceSelection(text)),
		dispose: async () => {
			interaction.dispose();
			await execution.dispose();
			await registry.dispose();
			target.destroy();
		},
	};
}
