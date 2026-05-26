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
} from '../../../modules/index.js';
import { createRuntime } from '../../../testing/index.js';
import { createReferencesModule } from '../../../modules/references/module.js';
import {
	filesystemFileReferenceExtension,
	pdfDocumentReferenceExtension,
	textDocumentReferenceExtension,
} from '../index.js';

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
		textDocumentReferenceExtension,
		pdfDocumentReferenceExtension,
		filesystemFileReferenceExtension,
	]);
	return { runtime, filesystem };
}

describe('built-in reference extensions', () => {
	it('materializes text.document references as model text', async () => {
		const { runtime } = await createReferenceRuntime();

		const context = await runtime.references.toContext({
			type: 'text.document',
			locator: 'hello',
			label: 'Note',
		});

		expect(context.content).toEqual([
			{ type: 'text', text: 'Reference: Note\n\nhello' },
		]);
	});

	it('materializes filesystem text files through text.document', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/note.txt' as AbsolutePath, 'from disk');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: '/project/note.txt',
			label: 'Disk note',
		});

		expect(context.content).toEqual([
			{ type: 'text', text: 'Reference: Disk note\n\nfrom disk' },
		]);
	});

	it('materializes filesystem PDF files through the PDF placeholder handler', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: '/project/paper.pdf',
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

	it('returns unavailable content for directories', async () => {
		const filesystem = new MemoryFilesystem();
		await filesystem.mkdir('/project/notes' as AbsolutePath);
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: '/project/notes',
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'Reference unavailable: Reference path is not a file: /project/notes',
			},
		]);
	});
});
