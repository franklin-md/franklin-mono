import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import { AuthActionProvider, type HostActionBinding } from '@franklin/react';
import { createStore } from '@franklin/agent';
import type { FranklinApp } from '@franklin/agent';
import type { DirectiveRegistry } from '../../shared/directives/registry.js';
import { InboxQuestionDirectives } from './directive/controller.js';
import { submitInboxSelection } from './directive/submit.js';
import { InboxCaptureChooser } from './quick-capture/host.js';
import type { QuestionNavigation } from './ui/navigation.js';
import { ApplicationProvider } from '@franklin/ui';
import type { InboxController } from './controller/controller.js';
import { InboxPanel } from './ui/panel.js';
import { errorMessage } from './controller/error.js';
import { captureSelection } from './host/capture.js';
import { stripDirectives } from '../../shared/directives/syntax/strip.js';
import { captureCurrentNote } from './host/current-note.js';
import { openQuestionSource } from './host/open-source.js';
import { INBOX_VIEW_TYPE, InboxView } from './host/view.js';
import { openPluginSettings } from '../../shared/obsidian/settings/open.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	inbox: InboxController;
	directives: DirectiveRegistry;
	hostActionBindings: readonly HostActionBinding[];
};

export function registerInbox({
	plugin,
	app,
	inbox,
	directives,
	hostActionBindings,
}: Options): () => Promise<void> {
	const report = (error: unknown) => {
		new Notice(errorMessage(error));
	};
	// Franklin reserves undefined for uninitialized stores; null means no navigation request.
	const navigation = createStore<QuestionNavigation | null>(null);
	async function activate(questionId?: string) {
		if (
			questionId &&
			!inbox.state
				.get()
				.questions.some((question) => question.id === questionId)
		)
			throw new Error('Question is no longer in the inbox');
		const { workspace } = plugin.app;
		const existing = workspace.getLeavesOfType(INBOX_VIEW_TYPE)[0];
		const leaf = existing ?? workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing)
			await leaf.setViewState({ type: INBOX_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
		if (questionId)
			navigation.set(() => ({ questionId, requestId: crypto.randomUUID() }));
	}
	const questionDirectives = new InboxQuestionDirectives({
		registry: directives,
		inbox,
		onOpen: (id) => {
			void activate(id).catch(report);
		},
		onError: report,
	});
	const captureChooser = new InboxCaptureChooser({
		app: plugin.app,
		inbox,
		definition: questionDirectives.definition,
		onError: report,
		onSuccess: (action) => {
			new Notice(
				action === 'quick-add'
					? 'Question added to study inbox'
					: 'Thought dump added to study inbox',
			);
		},
	});
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
								navigation={navigation}
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
			const source = captureSelection({ editor, view });
			if (!source || !stripDirectives(source.quote).trim()) return false;
			if (!checking) {
				void submitInboxSelection({
					editor,
					view,
					inbox,
					definition: questionDirectives.definition,
				})
					.then(() => {
						new Notice('Question added to study inbox');
					})
					.catch(report);
			}
			return true;
		},
	});
	plugin.addCommand({
		id: 'open-inbox-capture-chooser',
		name: 'Open inbox capture chooser',
		editorCheckCallback: (checking, editor, view) => {
			const source = captureSelection({ editor, view });
			if (
				!captureChooser.isOpen &&
				(!source || !stripDirectives(source.quote).trim())
			)
				return false;
			if (!checking) {
				try {
					captureChooser.open(editor, view);
				} catch (error) {
					report(error);
				}
			}
			return true;
		},
	});
	return async () => {
		await captureChooser.dispose();
		await questionDirectives.dispose();
	};
}
