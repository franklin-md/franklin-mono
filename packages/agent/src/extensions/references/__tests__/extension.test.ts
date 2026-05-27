import { describe, expect, it, vi } from 'vitest';
import { createDependencyModule } from '@franklin/extensibility/module';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	createFolderScopedFilesystem,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import {
	buildStateExtensionModule,
	createEnvironmentModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '../../../modules/index.js';
import { createRuntime } from '../../../testing/index.js';
import { createReferencesModule } from '../../../modules/references/module.js';
import type { PDFConverter } from '../../pdf/types.js';
import {
	createPDFDocumentReferenceExtension,
	filesystemFileReferenceExtension,
	textDocumentReferenceExtension,
} from '../index.js';

const pdfMocks = vi.hoisted(() => ({
	freeConstructor: vi.fn(),
	freeConvertPDF: vi.fn<PDFConverter['convertPDF']>(),
}));

vi.mock('../../pdf/providers/free.js', () => ({
	FreePDFConverter: vi.fn(function (options) {
		pdfMocks.freeConstructor(options);
		return { convertPDF: pdfMocks.freeConvertPDF };
	}),
}));

vi.mock('../../pdf/providers/mistral.js', () => ({
	MistralPDFConverter: vi.fn(),
}));

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function createEnvironment(filesystem: Filesystem): ReconfigurableEnvironment {
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

async function createReferenceRuntime(
	filesystem: Filesystem = new MemoryFilesystem(),
) {
	const module = buildStateExtensionModule([
		createReferencesModule(),
		createEnvironmentModule(async () => createEnvironment(filesystem)),
		createDependencyModule('auth', {
			getApiKey: vi.fn(async () => undefined),
		}),
	]);
	pdfMocks.freeConvertPDF.mockResolvedValue({
		markdown: 'converted pdf',
		screenshots: [],
	});
	const runtime = await createRuntime(module, { env: defaultConfig }, [
		filesystemFileReferenceExtension,
		createPDFDocumentReferenceExtension({ renderScreenshots: vi.fn() }),
		textDocumentReferenceExtension,
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

		expect(context.content).toEqual([{ type: 'text', text: 'from disk' }]);
	});

	it('materializes filesystem PDF files through the PDF reference handler', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: '/project/paper.pdf',
			selector: 'page=10',
			label: 'Paper',
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'converted pdf',
			},
		]);
	});

	it('passes PDF page ranges through the PDF reference handler', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime(filesystem);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: '/project/paper.pdf',
			selector: 'pages=10-12',
			label: 'Paper',
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'converted pdf',
			},
		]);
		expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(
			expect.any(Uint8Array),
			{ pages: { startPage: 10, endPage: 12 } },
		);
	});

	it('keeps the original locator when delegating filesystem data', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime(
			createFolderScopedFilesystem('/project' as AbsolutePath, filesystem),
		);

		const context = await runtime.references.toContext({
			type: 'filesystem.file',
			locator: 'paper.pdf',
		});

		expect(context.content).toEqual([
			{
				type: 'text',
				text: 'converted pdf',
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
		expect(context.isError).toBe(true);
	});
});
