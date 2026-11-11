import type { InboxController } from '../controller/controller.js';
import type { DirectiveRegistry } from '../../../shared/directives/registry.js';
import { DirectiveScribe } from '../../../shared/directives/scribe/operations.js';
import { InboxQuestionPill } from './pill.js';
import type { InboxQuestionDirectiveState } from './types.js';

type Options = {
	registry: DirectiveRegistry;
	inbox: InboxController;
	onOpen: (questionId: string) => void;
	onError: (error: unknown) => void;
};

export class InboxQuestionDirectives {
	readonly definition;
	private readonly unsubscribe: () => void;
	private pending = Promise.resolve();
	private closed = false;
	private readonly cleaned = new Set<string>();

	constructor({ registry, inbox, onOpen, onError }: Options) {
		this.definition = registry.registerDirective<InboxQuestionDirectiveState>(
			'inbox-question',
			({ state }) => (
				<InboxQuestionPill
					state={state}
					inbox={inbox}
					onOpen={onOpen}
					onError={onError}
				/>
			),
		);
		this.unsubscribe = inbox.subscribeSaved((document) => {
			const questions = new Set(
				document.questions.map((question) => question.id),
			);
			// Capture candidates now: a later create belongs to a newer saved snapshot.
			const missing = this.definition
				.instances()
				.filter((instance) => !questions.has(instance.state.get().questionId));
			this.pending = this.pending
				.then(async () => {
					for (const instance of missing) {
						if (this.closed) return;
						if (this.cleaned.has(instance.id)) continue;
						const result = await new DirectiveScribe(instance).replace('');
						if (result.failures.length) {
							onError(
								new Error(
									`Could not remove Inbox pill: ${result.failures.map((failure) => `${failure.path}: ${failure.error}`).join('; ')}`,
								),
							);
						} else this.cleaned.add(instance.id);
					}
				})
				.catch(onError);
		});
	}

	async dispose(): Promise<void> {
		this.closed = true;
		this.unsubscribe();
		await this.pending;
	}
}
