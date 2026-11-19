import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { FranklinApp } from '@franklin/agent';
import { createStore } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import { activateView } from '../../shared/obsidian/activate-view.js';
import { openPluginSettings } from '../../shared/obsidian/settings/open.js';
import { ObsidianAuthActionProvider } from '../../shared/ui/auth-action-provider.js';
import { InboxPanel } from './ui/panel.js';
import type { InboxController } from './controller/index.js';
import { errorMessage } from './controller/error.js';
import { selectionQuestion } from './selection-question.js';
import { captureSelection } from './host/capture.js';
import { captureCurrentNote } from './host/current-note.js';
import { openQuestionSource } from './host/open-source.js';
import { INBOX_VIEW_TYPE, InboxView } from './host/view.js';
import type { DirectiveRegistry } from '../../shared/directives/registry.js';
import { stripDirectives } from '../../shared/directives/syntax/strip.js';
import { InboxQuestionDirectives } from './directive/controller.js';
import { submitInboxSelection } from './directive/submit.js';
import { InboxCaptureChooser } from './quick-capture/host.js';
import type { QuestionNavigation } from './ui/navigation.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	inbox: InboxController;
	hostActionBindings: readonly HostActionBinding[];
	directives?: Promise<DirectiveRegistry | undefined>;
};

export function registerInbox({
	plugin,
	app,
	inbox,
	hostActionBindings,
	directives,
}: Options): () => Promise<void> {
	const report = (error: unknown) => {
		new Notice(errorMessage(error));
	};
	const navigation = createStore<QuestionNavigation | null>(null);
	let questionDirectives: InboxQuestionDirectives | undefined;
	let captureChooser: InboxCaptureChooser | undefined;
	let disposed = false;
	const submissions = new Set<Promise<void>>();
	async function navigate(questionId: string) {
		if (
			!inbox.state
				.get()
				.questions.some((question) => question.id === questionId)
		)
			throw new Error('Question is no longer in the inbox');
		await activateView(plugin.app.workspace, INBOX_VIEW_TYPE);
		navigation.set(() => ({ questionId, requestId: crypto.randomUUID() }));
	}
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
						<ObsidianAuthActionProvider
							app={plugin.app}
							pluginId={plugin.manifest.id}
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
						</ObsidianAuthActionProvider>
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
			if (!source || !stripDirectives(source.quote).trim()) return false;
			if (!checking) {
				const add = questionDirectives
					? submitInboxSelection({
							editor,
							view,
							inbox,
							definition: questionDirectives.definition,
						})
					: inbox.add(selectionQuestion(source.quote), { source });
				const submission = add
					.then(() => {
						new Notice('Question added to study inbox');
					})
					.catch(report);
				submissions.add(submission);
				void submission.finally(() => {
					submissions.delete(submission);
				});
			}
			return true;
		},
	});
	void directives
		?.then((registry) => {
			if (!registry || disposed) return;
			questionDirectives = new InboxQuestionDirectives({
				registry,
				inbox,
				onOpen: (id) => {
					void navigate(id).catch(report);
				},
				onError: report,
				pluginId: plugin.manifest.id,
			});
			const chooser = new InboxCaptureChooser({
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
			captureChooser = chooser;
			plugin.addCommand({
				id: 'open-inbox-capture-chooser',
				name: 'Open inbox capture chooser',
				editorCheckCallback: (checking, editor, view) => {
					const source = captureSelection({ editor, view });
					if (
						!chooser.isOpen &&
						(!source || !stripDirectives(source.quote).trim())
					)
						return false;
					if (!checking) {
						try {
							chooser.open(editor, view);
						} catch (error) {
							report(error);
						}
					}
					return true;
				},
			});
		})
		.catch(report);
	return async () => {
		disposed = true;
		await Promise.allSettled([captureChooser?.dispose(), ...submissions]);
		await questionDirectives?.dispose();
	};
}
