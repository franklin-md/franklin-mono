import { describe, expect, it, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import {
	buildStateExtensionModule,
	createEnvironmentModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/extensions';
import { createRuntime } from '@franklin/extensions/testing';
import { createReferencesModule } from '../module.js';
import { referencesExtension } from '../index.js';

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function createEnvironment(
	filesystem: MemoryFilesystem,
): ReconfigurableEnvironment {
	return {
		filesystem,
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => defaultConfig),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

async function createReferenceRuntime(filesystem = new MemoryFilesystem()) {
	const module = buildStateExtensionModule([
		createReferencesModule(),
		createEnvironmentModule(async () => createEnvironment(filesystem)),
	]);
	const runtime = await createRuntime(module, { env: defaultConfig }, [
		referencesExtension(),
	]);
	return { runtime, filesystem };
}

describe('referencesExtension', () => {
	it('materializes text.document references as model text', async () => {
		const { runtime } = await createReferenceRuntime();

		const context = await runtime.references.toContext({
			type: 'text.document',
			locator: { text: 'hello', uri: 'memory://note' },
			label: 'Note',
		});

		expect(context.content).toEqual([
			{ type: 'text', text: 'Reference: Note\n\nhello' },
		]);
	});

	it('delegates filesystem text files to text.document', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.txt' as AbsolutePath, 'from disk');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: { path: '/project/note.txt' },
			label: 'Disk note',
		});

		expect(context.content).toEqual([
			{ type: 'text', text: 'Reference: Disk note\n\nfrom disk' },
		]);
	});

	it('delegates filesystem PDF files to the PDF placeholder handler', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: { path: '/project/paper.pdf' },
			selector: { page: 10 },
			label: 'Paper',
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'PDF reference unavailable: Paper page 10. PDF extraction is not implemented in v1.',
			},
		]);
	});

	it('returns unavailable content for invalid filesystem locators', async () => {
		const { runtime } = await createReferenceRuntime();

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: { id: 'not-a-path' },
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'Reference unavailable: filesystem.file references require a locator with string path',
			},
		]);
	});
});
