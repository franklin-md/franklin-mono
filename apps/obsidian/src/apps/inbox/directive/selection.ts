import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import type { DirectiveWriteTarget } from '../../../shared/directives/scribe/types.js';
import { DirectiveScribe } from '../../../shared/directives/scribe/operations.js';
import type { InboxController } from '../controller/controller.js';
import { errorMessage } from '../controller/error.js';
import { QuestionSaveError } from '../controller/save-error.js';
import { selectionQuestion } from '../selection-question.js';
import type { QuestionSource } from '../types.js';
import type { InboxQuestionDirectiveState } from './types.js';

type Options = {
	source: QuestionSource;
	target: DirectiveWriteTarget;
	inbox: InboxController;
	definition: DirectiveDefinition<InboxQuestionDirectiveState>;
};

export class InboxSelection {
	private questionId?: string;
	private needsSave = false;
	private instance?: DirectiveInstance<InboxQuestionDirectiveState>;
	private pending?: Promise<void>;
	private done = false;
	private disposed = false;

	constructor(private readonly options: Options) {}
	get source() {
		return this.options.source;
	}
	get target() {
		return this.options.target;
	}

	submit(): Promise<void> {
		if (this.disposed) return Promise.reject(new Error('Capture is closed'));
		if (this.done) return Promise.resolve();
		if (this.pending) return this.pending;
		const pending = this.run();
		this.pending = pending;
		const clear = () => {
			this.pending = undefined;
		};
		void pending.then(clear, clear);
		return pending;
	}

	dispose(): void {
		this.disposed = true;
		this.target.dispose();
	}

	private async run(): Promise<void> {
		const { inbox, definition, target } = this.options;
		try {
			if (!this.questionId) {
				await this.addQuestion();
			} else if (this.needsSave) {
				this.assertQuestion();
				await inbox.retrySave();
				this.needsSave = false;
			}
			const questionId = this.assertQuestion();
			this.instance ??= await definition.create({
				questionId,
			});
			this.assertQuestion();
			await new DirectiveScribe(this.instance).write(target);
			this.done = true;
		} catch (error) {
			const status =
				this.questionId && !this.needsSave
					? 'Question saved; could not insert its Inbox pill'
					: 'Could not finish adding the Inbox question pill';
			throw new Error(`${status}: ${errorMessage(error)}`, { cause: error });
		}
	}

	private async addQuestion(): Promise<void> {
		const { inbox, source } = this.options;
		try {
			this.questionId = await inbox.add(
				selectionQuestion(source.quote),
				undefined,
				source,
			);
		} catch (error) {
			if (error instanceof QuestionSaveError) {
				this.questionId = error.questionId;
				this.needsSave = true;
			}
			throw error;
		}
	}

	private assertQuestion(): string {
		const questionId = this.questionId;
		if (
			!questionId ||
			!this.options.inbox.state
				.get()
				.questions.some((question) => question.id === questionId)
		)
			throw new Error(
				'The question was deleted before its pill could be inserted',
			);
		return questionId;
	}
}
