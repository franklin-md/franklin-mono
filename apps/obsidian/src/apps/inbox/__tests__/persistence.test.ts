import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNodeFilesystem } from '@franklin/node';
import { toAbsolutePath } from '@franklin/lib';
import type { AuthManager } from '@franklin/agent';
import { createMockMiniACP, toolCalls, turnEnd } from '@franklin/mini-acp/mock';
import { createInboxPersistence } from '../storage/persistence.js';
import { InboxController } from '../controller/index.js';
import { createInboxRunner } from '../agent/run.js';
import { createInboxTestEnvironment } from '../agent/test-environment.js';

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});
async function storage() {
	const directory = await mkdtemp(join(tmpdir(), 'franklin-inbox-'));
	directories.push(directory);
	return {
		directory,
		path: join(directory, 'inbox.json'),
		settingsPath: join(directory, 'inbox-settings.json'),
		persister: createInboxPersistence({
			filesystem: createNodeFilesystem(),
			path: toAbsolutePath(join(directory, 'inbox.json')),
		}),
	};
}
const defaults = { provider: 'test', model: 'test', reasoning: 'off' as const };

describe('inbox disk persistence and runtime integration', () => {
	it('saves an answer from the real Franklin tool path, restores it, and removes its disk contents on deletion', async () => {
		const { directory, path, persister } = await storage();
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'return_answer',
						arguments: {
							title: 'Why recheck the condition?',
							details: [
								{
									title: 'Why',
									content: 'Another process may consume the condition first.',
								},
							],
							shortAnswer: 'Recheck under the lock.',
						},
					},
				]),
				turnEnd(),
			],
		});
		const run = createInboxRunner(
			createInboxTestEnvironment().runnerOptions(mock.connector, {
				getApiKey: async () => 'private-test-key',
				onAuthChange: () => () => {},
			} as unknown as AuthManager),
		);
		const inbox = await InboxController.create({
			defaults: { ...defaults, reasoning: 'max' },
			persistence: persister,
			run,
		});
		const id = await inbox.add('Why recheck?');
		await vi.waitFor(() =>
			expect(inbox.state.get().questions[0]?.state.kind).toBe('answered'),
		);
		await inbox.dispose();
		const data = await readFile(path, 'utf8');
		expect(data).toContain('Recheck under the lock.');
		expect(data).toContain('Another process may consume the condition first.');
		expect(data).toContain('Why recheck the condition?');
		expect(data).not.toContain('private-test-key');
		expect(data).not.toContain('systemPrompt');
		expect((await readdir(directory)).sort()).toEqual([
			'inbox-settings.json',
			'inbox.json',
		]);
		expect(mock.calls().disposes).toBe(1);
		const restored = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		expect(restored.settings.get().reasoning).toBe('max');
		expect(restored.state.get().questions[0]?.reasoning).toBe('max');
		expect(restored.state.get().questions[0]?.state).toEqual({
			kind: 'answered',
			answer: 'Recheck under the lock.',
			details: [
				{
					title: 'Why',
					content: 'Another process may consume the condition first.',
				},
			],
			title: 'Why recheck the condition?',
		});
		await restored.remove(id);
		await restored.dispose();
		const after = await readFile(path, 'utf8');
		expect(after).not.toContain('Why recheck?');
		expect(after).not.toContain('Recheck under the lock.');
		expect(after).not.toContain(
			'Another process may consume the condition first.',
		);
		expect(after).not.toContain('Why recheck the condition?');
	});
	it('leaves malformed files untouched', async () => {
		const { directory, path, persister } = await storage();
		await writeFile(path, 'incomplete json');
		await expect(
			InboxController.create({
				defaults,
				persistence: persister,
				run: vi.fn(),
			}),
		).rejects.toThrow('preserved');
		expect(await readFile(path, 'utf8')).toBe('incomplete json');
		expect(await readdir(directory)).toEqual(['inbox.json']);
	});

	it.each([
		['groups', 6],
		['actions', 6],
		['actionRuns', 6],
		['thoughtDumps', 6],
		['actions', 8],
		['actionRuns', 8],
	])(
		'preserves the exact saved file and starts no work when it contains %s in version %i',
		async (field, version) => {
			const { path, persister } = await storage();
			const contents =
				JSON.stringify(
					{
						version,
						data: {
							questions: [],
							preferences: {
								...defaults,
								answerInstructions: '',
								concurrency: 3,
							},
							[field]: [{ id: 'keep-this-record' }],
						},
					},
					null,
					2,
				) + '\n';
			await writeFile(path, contents);
			const run = vi.fn();
			await expect(
				InboxController.create({ defaults, persistence: persister, run }),
			).rejects.toThrow('preserved');
			expect(run).not.toHaveBeenCalled();
			expect(await readFile(path, 'utf8')).toBe(contents);
		},
	);
});

describe('moving settings out of inbox.json', () => {
	const preferences = {
		provider: 'saved',
		model: 'saved-model',
		reasoning: 'high',
		answerInstructions: 'Answer in one line.',
		concurrency: 2,
		mode: 'thought-dump',
	};
	const action = {
		id: 'cards',
		name: 'Cards',
		prompt: 'Draft flashcards.',
		icon: 'lucide-layers',
		color: 'purple',
	};
	const question = {
		id: 'q',
		rootId: 'q',
		attemptId: 'q-attempt',
		text: 'Why?',
		provider: 'saved',
		model: 'saved-model',
		reasoning: 'high',
		answerInstructions: 'Answer in one line.',
		createdAt: 1,
		updatedAt: 1,
		state: { kind: 'answered', answer: 'Because.' },
	};
	const version11 = JSON.stringify({
		version: 11,
		data: { questions: [question], preferences, actions: [action] },
	});
	const read = async (path: string) =>
		JSON.parse(await readFile(path, 'utf8')) as unknown;

	it('saves the settings of a version 11 inbox.json to inbox-settings.json and keeps its questions', async () => {
		const { path, settingsPath, persister } = await storage();
		await writeFile(path, version11);
		const inbox = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		const settings = { ...preferences, actions: [action] };
		expect(inbox.settings.get()).toEqual(settings);
		expect(inbox.state.get().questions.map((item) => item.id)).toEqual(['q']);
		await inbox.dispose();
		expect(await read(settingsPath)).toEqual({ version: 1, data: settings });
		expect(await read(path)).toEqual({
			version: 12,
			data: { questions: [question], actionRuns: [] },
		});
		const reopened = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		expect(reopened.settings.get()).toEqual(settings);
		await reopened.dispose();
	});

	it('keeps an existing settings file when inbox.json still holds older settings', async () => {
		const { path, settingsPath, persister } = await storage();
		// A crash after the settings write leaves inbox.json at version 11.
		const saved = {
			...preferences,
			model: 'newer-model',
			concurrency: 4,
			actions: [],
		};
		await writeFile(settingsPath, JSON.stringify({ version: 1, data: saved }));
		await writeFile(path, version11);
		const inbox = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		expect(inbox.settings.get()).toEqual(saved);
		await inbox.dispose();
		expect(await read(path)).toMatchObject({ version: 12 });
	});

	it('leaves a version 11 inbox.json untouched when its settings cannot be saved', async () => {
		const { path, settingsPath, persister } = await storage();
		await writeFile(path, version11);
		vi.spyOn(persister.settings, 'save').mockRejectedValueOnce(
			new Error('Disk full'),
		);
		await expect(
			InboxController.create({
				defaults,
				persistence: persister,
				run: vi.fn(),
			}),
		).rejects.toThrow('Disk full');
		expect(await readFile(path, 'utf8')).toBe(version11);
		await expect(readFile(settingsPath, 'utf8')).rejects.toThrow();
	});

	it('preserves both files when the settings file is unreadable', async () => {
		const { path, settingsPath, persister } = await storage();
		await writeFile(path, version11);
		await writeFile(settingsPath, '{broken');
		await expect(
			InboxController.create({
				defaults,
				persistence: persister,
				run: vi.fn(),
			}),
		).rejects.toThrow('Could not load Inbox settings');
		expect(await readFile(path, 'utf8')).toBe(version11);
		expect(await readFile(settingsPath, 'utf8')).toBe('{broken');
	});

	it('starts from the defaults when the settings file of a version 12 inbox.json is missing', async () => {
		const { path, persister } = await storage();
		await writeFile(
			path,
			JSON.stringify({ version: 12, data: { questions: [], actionRuns: [] } }),
		);
		const inbox = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		expect(inbox.settings.get()).toMatchObject({ ...defaults, actions: [] });
		await inbox.dispose();
	});
});
