import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { FranklinApp } from '@franklin/agent';
import { AuthActionProvider, type HostActionBinding } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import { activateView } from '../../shared/obsidian/activate-view.js';
import { openPluginSettings } from '../../shared/obsidian/settings/open.js';
import { InboxPanel } from './ui/panel.js';
import type { InboxController } from './controller/index.js';
import { errorMessage } from './controller/error.js';
import { selectionQuestion } from './selection-question.js';
import { captureSelection } from './host/capture.js';
import { captureCurrentNote } from './host/current-note.js';
import { openQuestionSource } from './host/open-source.js';
import { INBOX_VIEW_TYPE, InboxView } from './host/view.js';

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
	const activate = () => {
		void activateView(plugin.app.workspace, INBOX_VIEW_TYPE).catch(report);
	};
	plugin.registerView(
		INBOX_VIEW_TYPE,
		(leaf) =>
			new InboxView(leaf, {
				renderContent: () => (
					<ApplicationProvider
						harness={app}
						hostActionBindings={hostActionBindings}
					>
						<AuthActionProvider
							handlers={{
								requestApiKey: () =>
									openPluginSettings(
										plugin.app,
										plugin.manifest.id,
										'connections',
									),
							}}
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
									openPluginSettings(plugin.app, plugin.manifest.id, 'inbox')
								}
								onError={report}
							/>
						</AuthActionProvider>
					</ApplicationProvider>
				),
			}),
	);
	plugin.addRibbonIcon('inbox', 'Open study inbox', activate);
	plugin.addCommand({
		id: 'open-study-inbox',
		name: 'Open study inbox',
		callback: activate,
	});
	plugin.addCommand({
		id: 'selection-to-study-inbox',
		name: 'Add selection to study inbox',
		editorCheckCallback: (checking, editor, view) => {
			const source = captureSelection({ editor, view });
			if (!source) return false;
			if (!checking) {
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
