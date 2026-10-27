import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNodeFilesystem } from '@franklin/node';
import { toAbsolutePath } from '@franklin/lib';
import type { AuthManager } from '@franklin/agent';
import { createMockMiniACP, toolCalls, turnEnd } from '@franklin/mini-acp/mock';
import { createInboxPersistence } from '../host/persistence.js';
import { InboxController } from '../controller/controller.js';
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
							answer: 'Recheck under the lock.',
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
			defaults,
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
		expect(data).toContain('Why recheck the condition?');
		expect(data).not.toContain('private-test-key');
		expect(data).not.toContain('systemPrompt');
		expect(await readdir(directory)).toEqual(['inbox.json']);
		expect(mock.calls().disposes).toBe(1);
		const restored = await InboxController.create({
			defaults,
			persistence: persister,
			run: vi.fn(),
		});
		expect(restored.state.get().questions[0]?.state).toEqual({
			kind: 'answered',
			answer: 'Recheck under the lock.',
			title: 'Why recheck the condition?',
		});
		await restored.remove(id);
		await restored.dispose();
		const after = await readFile(path, 'utf8');
		expect(after).not.toContain('Why recheck?');
		expect(after).not.toContain('Recheck under the lock.');
		expect(after).not.toContain('Why recheck the condition?');
	});
	it('leaves malformed files untouched', async () => {
		const { path, persister } = await storage();
		await writeFile(path, 'incomplete json');
		await expect(
			InboxController.create({
				defaults,
				persistence: persister,
				run: vi.fn(),
			}),
		).rejects.toThrow('preserved');
		expect(await readFile(path, 'utf8')).toBe('incomplete json');
	});
});
