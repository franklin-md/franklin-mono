import {
	createMockMiniACP,
	finishedTurn,
	toolCalls,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { toAbsolutePath } from '@franklin/lib';
import { describe, expect, it } from 'vitest';
import { createQuickEditRunner } from '../run.js';
import { createQuickEditTestRuntime } from '../testing/runtime.js';
import { quickEditEnvironment } from '../config.js';
import { configureFilesystem } from '@franklin/agent';
import type { QuickEditRequest } from '../../types.js';

const request = (): QuickEditRequest => ({
	state: {
		path: 'Note.md',
		line: 0,
		selection: '',
		prompt: 'Add a bullet two lines below, preserving the outline.',
		status: 'running',
		error: '',
	},
	settings: {
		provider: 'test',
		model: 'edit-model',
		reasoning: 'low',
		instructions: 'Keep my nested outline.',
		presets: [],
	},
	signal: new AbortController().signal,
});

describe('quick edit agent', () => {
	it('uses real read/edit tools to edit below the cursor, verifies and disposes', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([{ name: 'read_file', arguments: { path: 'Note.md' } }]),
				toolCalls([
					{
						name: 'edit_file',
						arguments: {
							path: 'Note.md',
							old_text: '  - existing',
							new_text: '  - existing\n  - added',
						},
					},
				]),
				toolCalls([{ name: 'read_file', arguments: { path: 'Note.md' } }]),
				toolCalls([
					{
						name: 'finish_edit',
						arguments: { success: true, summary: 'Added a sibling bullet.' },
					},
				]),
				turnEnd(),
			],
		});
		const h = createQuickEditTestRuntime(mock.connector);
		await h.filesystem.mkdir(toAbsolutePath('/vault'), { recursive: true });
		await h.filesystem.writeFile(
			toAbsolutePath('/vault/Note.md'),
			'# Heading\n- parent\n  - existing',
		);
		await createQuickEditRunner(h.app, h.franklin)(request());
		expect(
			new TextDecoder().decode(
				await h.filesystem.readFile(toAbsolutePath('/vault/Note.md')),
			),
		).toBe('# Heading\n- parent\n  - existing\n  - added');
		expect(mock.calls().toolResults.every((result) => !result.isError)).toBe(
			true,
		);
		expect(mock.context().config.model).toBe('edit-model');
		for (const name of ['bash', 'write_file'])
			expect(mock.context().tools.map((tool) => tool.name)).not.toContain(name);
		expect(JSON.stringify(mock.calls().prompts)).toContain(
			'Keep my nested outline.',
		);
		expect(h.dispose).toHaveBeenCalledOnce();
	});

	it('treats a missing completion report as failure and still disposes', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const h = createQuickEditTestRuntime(mock.connector);
		await expect(
			createQuickEditRunner(h.app, h.franklin)(request()),
		).rejects.toThrow('without reporting');
		expect(h.dispose).toHaveBeenCalledOnce();
	});

	it('reports agent-declared failure rather than showing completion', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([
					{
						name: 'finish_edit',
						arguments: {
							success: false,
							summary: 'Could not identify the intended outline item.',
						},
					},
				]),
				turnEnd(),
			],
		});
		const h = createQuickEditTestRuntime(mock.connector);
		await expect(
			createQuickEditRunner(h.app, h.franklin)(request()),
		).rejects.toThrow('intended outline');
	});

	it('denies writes to another note while allowing reads for context', async () => {
		const mock = createMockMiniACP({
			defaultTurn: [
				toolCalls([{ name: 'read_file', arguments: { path: 'Other.md' } }]),
				toolCalls([
					{
						name: 'edit_file',
						arguments: {
							path: 'Other.md',
							old_text: 'original',
							new_text: 'changed',
						},
					},
				]),
				toolCalls([
					{
						name: 'finish_edit',
						arguments: { success: false, summary: 'Write refused.' },
					},
				]),
				turnEnd(),
			],
		});
		const h = createQuickEditTestRuntime(mock.connector);
		await h.filesystem.mkdir(toAbsolutePath('/vault'), { recursive: true });
		await h.filesystem.writeFile(toAbsolutePath('/vault/Other.md'), 'original');
		await expect(
			createQuickEditRunner(h.app, h.franklin)(request()),
		).rejects.toThrow('Write refused');
		expect(
			new TextDecoder().decode(
				await h.filesystem.readFile(toAbsolutePath('/vault/Other.md')),
			),
		).toBe('original');
		expect(mock.calls().toolResults.some((result) => result.isError)).toBe(
			true,
		);
	});

	it('scopes write permission to literal note names containing pattern characters', async () => {
		const h = createQuickEditTestRuntime(
			createMockMiniACP({ defaultTurn: finishedTurn() }).connector,
		);
		await h.filesystem.mkdir(toAbsolutePath('/vault'), { recursive: true });
		const name = 'Outline [draft] #1.md';
		const config = quickEditEnvironment(h.app, name);
		const fs = configureFilesystem(h.filesystem, config.fsConfig);
		await fs.writeFile(toAbsolutePath('/vault/' + name), 'literal title');
		await expect(
			fs.writeFile(toAbsolutePath('/vault/Outline d #1.md'), 'wrong file'),
		).rejects.toThrow('denied');
	});
});
