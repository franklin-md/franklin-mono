import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { HostActionBinding } from '@franklin/react';
import type { FranklinApp } from '@franklin/agent';
import { ApplicationProvider } from '@franklin/ui';
import type { InboxController } from '../controller/controller.js';
import { InboxPanel } from '../ui/panel.js';
import { errorMessage } from '../controller/error.js';
import { captureSelection } from './capture.js';
import { captureCurrentNote } from './current-note.js';
import { selectionQuestion } from '../selection-question.js';
import { openQuestionSource } from './open-source.js';
import { INBOX_VIEW_TYPE, InboxView } from './view.js';
import { openPluginSettings } from '../../settings/open.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	inbox: InboxController;
	hostActionBindings: readonly HostActionBinding[];
};

export function registerInbox({
	plugin,
	app,
	inbox,
	hostActionBindings,
}: Options): void {
	const report = (error: unknown) => {
		new Notice(errorMessage(error));
	};
	async function activate() {
		const { workspace } = plugin.app;
		const existing = workspace.getLeavesOfType(INBOX_VIEW_TYPE)[0];
		const leaf = existing ?? workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing)
			await leaf.setViewState({ type: INBOX_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}
	plugin.registerView(
		INBOX_VIEW_TYPE,
		(leaf) =>
			new InboxView(leaf, {
				renderContent: () => (
					<ApplicationProvider
						harness={app}
						hostActionBindings={hostActionBindings}
					>
						<InboxPanel
							controller={inbox}
							captureContext={(question) =>
								captureCurrentNote(plugin.app, question)
							}
							onOpenSource={(source) => {
								void openQuestionSource(plugin.app, source).catch(report);
							}}
							onSettings={() =>
								openPluginSettings(plugin.app, plugin.manifest.id)
							}
							onError={report}
						/>
					</ApplicationProvider>
				),
			}),
	);
	plugin.addRibbonIcon('inbox', 'Open study inbox', () => {
		void activate().catch(report);
	});
	plugin.addCommand({
		id: 'open-study-inbox',
		name: 'Open study inbox',
		callback: () => {
			void activate().catch(report);
		},
	});
	plugin.addCommand({
		id: 'selection-to-study-inbox',
		name: 'Add selection to study inbox',
		editorCheckCallback: (checking, editor, view) => {
			if (!editor.getSelection().trim() || !view.file) return false;
			if (!checking) {
				const source = captureSelection({ editor, view });
				if (source)
					void inbox
						.add(selectionQuestion(source.quote), undefined, source)
						.then(() => {
							new Notice('Question added to study inbox');
						})
						.catch(report);
			}
			return true;
		},
	});
}
