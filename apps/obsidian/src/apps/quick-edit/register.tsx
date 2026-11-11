import { Notice, editorLivePreviewField } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { FranklinApp } from '@franklin/agent';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import type { DirectiveRegistry } from '../../shared/directives/registry.js';
import type { DiffClient } from '../../shared/diff/client.js';
import { getPluginAbsolutePath } from '../../shared/obsidian/path.js';
import { QuickEditController } from './execution/controller.js';
import { createQuickEditRunner } from './execution/run.js';
import { QuickEditInteraction } from './interaction/composer.js';
import { QuickEditPill } from './interaction/pill.js';
import { quickEditExtension } from './interaction/extension.js';
import { quickEditView } from './interaction/editor.js';
import { dismissQuickEdit } from './interaction/dismiss.js';
import { QuickEditPreferences } from './settings/store.js';
import { createQuickEditPersistence } from './settings/persistence.js';
import { quickEditError } from './error.js';
import type { QuickEditState } from './types.js';

type Options = {
	plugin: Plugin;
	franklin: FranklinApp;
	registry: DirectiveRegistry;
	diff: DiffClient;
};

export async function registerQuickEdit({
	plugin,
	franklin,
	registry,
	diff,
}: Options) {
	const report = (error: unknown) => {
		new Notice(quickEditError(error));
	};
	const preferences = await QuickEditPreferences.create(
		createQuickEditPersistence(
			joinAbsolute(
				toAbsolutePath(
					getPluginAbsolutePath(plugin.app.vault, plugin.manifest),
				),
				'quick-edit.json',
			),
		),
		{
			...franklin.settings.get().defaultLLMConfig,
			instructions:
				'Preserve and extend the existing outline, indentation, links, and writing style. Read the surrounding note and applicable vault instructions before making the smallest useful edit.',
		},
	);
	const definition = registry.registerDirective<QuickEditState>(
		'quick-edit',
		({ id, state }) => (
			<QuickEditPill
				state={state}
				edit={() => {
					void interaction.open(id).catch(report);
				}}
				dismiss={() => {
					const instance = definition.get(id);
					if (instance) void dismissQuickEdit(instance, diff).catch(report);
				}}
				stop={() => execution.stop()}
			/>
		),
	);
	const execution = new QuickEditController({
		definition,
		run: createQuickEditRunner(plugin.app, franklin),
		getSettings: () => preferences.state.get(),
	});
	const interaction = new QuickEditInteraction({
		app: plugin.app,
		definition,
		execution,
		report,
	});
	await execution.restore();
	plugin.registerEditorExtension(
		quickEditExtension({
			submit: (view) => interaction.submit(view),
			cancel: (view) => interaction.cancel(view),
		}),
	);
	plugin.addCommand({
		id: 'quick-edit',
		name: 'Quick edit',
		editorCheckCallback: (checking, editor, info) => {
			const view = quickEditView(editor);
			if (!info.file || !view?.state.field(editorLivePreviewField, false))
				return false;
			if (!checking) void interaction.begin(editor, info).catch(report);
			return true;
		},
	});
	plugin.addCommand({
		id: 'stop-quick-edit',
		name: 'Stop quick edit',
		checkCallback: (checking) => {
			if (!execution.running) return false;
			if (!checking) execution.stop();
			return true;
		},
	});
	return {
		preferences,
		dispose: async () => {
			interaction.dispose();
			await execution.dispose();
			await preferences.dispose();
		},
	};
}
