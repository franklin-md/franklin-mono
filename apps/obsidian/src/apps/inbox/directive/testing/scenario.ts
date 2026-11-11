import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { App, TFile } from 'obsidian';
import type { SingleFilePersister } from '@franklin/lib';
import { InboxController } from '../../controller/controller.js';
import type {
	AnswerRequest,
	InboxControllerOptions,
	InboxDocument,
} from '../../controller/types.js';
import { DirectiveRegistry } from '../../../../shared/directives/registry.js';
import { createDirectiveTestPersistence } from '../../../../shared/directives/testing/persistence.js';
import { InboxQuestionDirectives } from '../controller.js';

type Scenario = {
	inbox: InboxController;
	persistence: SingleFilePersister<InboxDocument>;
	requests: AnswerRequest[];
	registry: DirectiveRegistry;
	storage: ReturnType<typeof createDirectiveTestPersistence>;
	app: App;
	service: InboxQuestionDirectives;
	open: Mock;
	error: Mock;
	process: Mock<
		(_file: TFile, change: (source: string) => string) => Promise<string>
	>;
	content: string;
};

export async function createInboxDirectiveScenario(
	run?: InboxControllerOptions['run'],
): Promise<Scenario> {
	let saved: InboxDocument | undefined;
	const persistence: SingleFilePersister<InboxDocument> = {
		load: async () => ({ value: saved, issues: [] }),
		save: vi.fn(async (next) => {
			saved = structuredClone(next);
		}),
		delete: async () => {
			saved = undefined;
		},
	};
	const requests: AnswerRequest[] = [];
	const inbox = await InboxController.create({
		persistence,
		defaults: { provider: 'test', model: 'test', reasoning: 'low' },
		run: async (request) => {
			requests.push(request);
			if (run) return run(request);
			await new Promise<void>((resolve) =>
				request.signal.addEventListener('abort', () => resolve(), {
					once: true,
				}),
			);
		},
	});
	let content = '';
	// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
	const file = { path: 'closed.md', extension: 'md' } as TFile;
	const process = vi.fn(
		async (_file: TFile, change: (source: string) => string) => {
			content = change(content);
			return content;
		},
	);
	const app = {
		workspace: { iterateAllLeaves: () => {} },
		vault: {
			getMarkdownFiles: () => [file],
			getFileByPath: (path: string) => (path === file.path ? file : null),
			read: async () => content,
			process,
		},
	} as unknown as App;
	const storage = createDirectiveTestPersistence();
	const registry = await DirectiveRegistry.create({
		app,
		persistence: storage,
	});
	const open = vi.fn();
	const error = vi.fn();
	const service = new InboxQuestionDirectives({
		registry,
		inbox,
		onOpen: open,
		onError: error,
	});
	return {
		inbox,
		persistence,
		requests,
		registry,
		storage,
		app,
		service,
		open,
		error,
		process,
		get content() {
			return content;
		},
		set content(value: string) {
			content = value;
		},
	};
}
