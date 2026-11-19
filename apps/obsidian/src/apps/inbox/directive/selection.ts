import type { Editor } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import type {
	DirectiveLocation,
	DirectiveWriteTarget,
} from '../../../shared/directives/scribe/types.js';
import { DirectiveScribe } from '../../../shared/directives/scribe/operations.js';
import type { InboxController } from '../controller/index.js';
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
	private submission?: Promise<DirectiveLocation>;
	private disposed = false;
	private readonly invoked: string;

	constructor(private readonly options: Options) {
		this.invoked = selectionKey(options.target.editor);
	}
	get source() {
		return this.options.source;
	}
	get target() {
		return this.options.target;
	}

	submit(): Promise<DirectiveLocation> {
		if (this.disposed) return Promise.reject(new Error('Capture is closed'));
		if (this.submission) return this.submission;
		const submission = this.run();
		this.submission = submission;
		// Keep a successful write so a repeat submit cannot insert a second pill.
		void submission.catch(() => {
			this.submission = undefined;
		});
		return submission;
	}

	dispose(): void {
		this.disposed = true;
		this.target.dispose();
	}

	private async run(): Promise<DirectiveLocation> {
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
			const { editor } = target;
			// Saving is asynchronous and the editor may keep focus meanwhile. A
			// moved selection or edit means the user has moved on, so leave it.
			const untouched = selectionKey(editor) === this.invoked;
			const location = await new DirectiveScribe(this.instance).write(target);
			if (untouched) editor.setCursor(editor.offsetToPos(location.to));
			return location;
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
			this.questionId = await inbox.add(selectionQuestion(source.quote), {
				source,
			});
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

function selectionKey(editor: Editor): string {
	const from = editor.posToOffset(editor.getCursor('from'));
	const to = editor.posToOffset(editor.getCursor('to'));
	return `${from}:${to}`;
}
