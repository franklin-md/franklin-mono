import { expect, it, vi } from 'vitest';
import { joinAbsolute } from '@franklin/lib';
import { createMockMiniACP, toolCalls, turnEnd } from '@franklin/mini-acp/mock';
import { InboxController } from '../controller/index.js';
import { createInboxRunner } from '../agent/run.js';
import { createInboxTestApp } from '../testing/app.js';
import { createInboxTestPersistence } from '../testing/persistence.js';

it('keeps repeated Inbox attempts out of the persisted chat and store collections', async () => {
	const mock = createMockMiniACP({
		defaultTurn: [
			toolCalls([
				{
					name: 'return_answer',
					arguments: {
						title: 'Is this isolated?',
						shortAnswer: 'Yes.',
						details: [],
					},
				},
			]),
			turnEnd(),
		],
	});
	const { app, appDir, filesystem, config, disposedEnvironments } =
		await createInboxTestApp(mock);
	app.auth.setApiKeyEntry('test', { type: 'apiKey', key: 'test-key' });
	const defaults = {
		provider: 'test',
		model: 'test-model',
		reasoning: 'off' as const,
	};
	const chat = await app.agents.create({
		state: { core: { llmConfig: defaults }, env: config },
	});
	const chatPath = joinAbsolute(appDir, 'sessions', `${chat.details.id}.json`);
	await vi.waitFor(async () =>
		expect(await filesystem.exists(chatPath)).toBe(true),
	);
	const persistedPaths = () =>
		Promise.all(
			['sessions', 'store'].map(async (folder) => {
				const path = joinAbsolute(appDir, folder);
				return (await filesystem.exists(path)) ? filesystem.readdir(path) : [];
			}),
		);
	const before = await persistedPaths();
	const inbox = await InboxController.create({
		defaults,
		persistence: createInboxTestPersistence().disk,
		run: createInboxRunner({
			createAgent: app.createAgent.bind(app),
			auth: app.auth,
			config,
			vaultName: 'Study',
		}),
	});
	try {
		await inbox.add('First question');
		await inbox.add('Second question');
		await vi.waitFor(() =>
			expect(
				inbox.state
					.get()
					.questions.every((question) => question.state.kind === 'answered'),
			).toBe(true),
		);
		await vi.waitFor(() => expect(disposedEnvironments()).toBe(2));
		expect(app.agents.list()).toEqual([chat]);
		expect(await persistedPaths()).toEqual(before);
	} finally {
		await inbox.dispose();
		await chat.runtime.dispose();
	}
});
