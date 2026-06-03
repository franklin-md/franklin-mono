import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { createDependencyModule } from '@franklin/extensibility/module';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	createReferencesModule,
	filesystemFileReferenceExtension,
	type AuthManager,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/agent';
import { createRuntime } from '@franklin/agent/testing';
import type { PDFConverter, RenderPDFScreenshots } from '../../types.js';
import { createPDFDocumentReferenceExtension } from '../pdf.js';

const pdfMocks = vi.hoisted(() => ({
	freeConstructor: vi.fn(),
	freeConvertPDF: vi.fn<PDFConverter['convertPDF']>(),
	mistralConstructor: vi.fn(),
	mistralConvertPDF: vi.fn<PDFConverter['convertPDF']>(),
}));

vi.mock('../../providers/free.js', () => ({
	FreePDFConverter: vi.fn(function (options) {
		pdfMocks.freeConstructor(options);
		return { convertPDF: pdfMocks.freeConvertPDF };
	}),
}));

vi.mock('../../providers/mistral.js', () => ({
	MistralPDFConverter: vi.fn(function (options) {
		pdfMocks.mistralConstructor(options);
		return { convertPDF: pdfMocks.mistralConvertPDF };
	}),
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

function mockAuthManager(apiKey?: string): AuthManager & {
	getApiKey: ReturnType<typeof vi.fn>;
} {
	return {
		getApiKey: vi.fn(async () => apiKey),
	} as unknown as AuthManager & { getApiKey: ReturnType<typeof vi.fn> };
}

async function createReferenceRuntime(input: {
	readonly filesystem: Filesystem;
	readonly auth?: AuthManager;
	readonly renderScreenshots?: RenderPDFScreenshots;
}) {
	const auth = input.auth ?? mockAuthManager();
	const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
	const module = buildStateExtensionModule([
		createCoreStateModule(mock.connector),
		createEnvironmentModule(async () => createEnvironment(input.filesystem)),
		createReferencesModule(),
		createDependencyModule('auth', auth),
	]);
	const runtime = await createRuntime(
		module,
		{ ...module.emptyState(), env: defaultConfig },
		[
			filesystemFileReferenceExtension,
			createPDFDocumentReferenceExtension({
				renderScreenshots: input.renderScreenshots ?? vi.fn(async () => []),
			}),
		],
	);
	return { runtime, auth, mock };
}

async function drain(iterable: AsyncIterable<unknown>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the mock prompt so the runtime sends system prompt context.
	}
}

describe('createPDFDocumentReferenceExtension', () => {
	beforeEach(() => {
		pdfMocks.freeConstructor.mockClear();
		pdfMocks.freeConvertPDF.mockReset();
		pdfMocks.mistralConstructor.mockClear();
		pdfMocks.mistralConvertPDF.mockReset();
		pdfMocks.freeConvertPDF.mockResolvedValue({
			markdown: 'free pdf',
			screenshots: [],
		});
		pdfMocks.mistralConvertPDF.mockResolvedValue({
			markdown: 'mistral pdf',
			screenshots: [],
		});
	});

	it('converts delegated filesystem PDFs with page range selectors', async () => {
		const filesystem = new MemoryFilesystem();
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const renderScreenshots = vi.fn(async () => []);
		const { runtime, auth } = await createReferenceRuntime({
			filesystem,
			auth: mockAuthManager(),
			renderScreenshots,
		});

		try {
			const context = await runtime.references.toContext({
				locator: '/project/paper.pdf',
				selector: 'pages=2-4',
				label: 'Paper',
			});

			expect(auth.getApiKey).toHaveBeenCalledWith('mistral');
			expect(pdfMocks.freeConstructor).toHaveBeenCalledWith({
				renderScreenshots,
			});
			expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
				pages: { startPage: 2, endPage: 4 },
			});
			expect(context.content).toEqual({
				type: 'text',
				text: 'Reference: Paper\n\nfree pdf',
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('defaults PDF materialization to the first ten pages with continuation guidance', async () => {
		const filesystem = new MemoryFilesystem();
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime({ filesystem });

		try {
			const context = await runtime.references.toContext({
				locator: '/project/paper.pdf',
			});

			expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
				pages: { startPage: 1, endPage: 10 },
			});
			expect(context.content).toEqual({
				type: 'text',
				text: 'Reference: /project/paper.pdf\n\nPDF materialization limited: showing up to pages 1-10. Continue with selector "pages=11-20" if needed.\n\nfree pdf',
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('clamps oversized PDF ranges and suggests the continuation range', async () => {
		const filesystem = new MemoryFilesystem();
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime({ filesystem });

		try {
			const context = await runtime.references.toContext({
				locator: '/project/paper.pdf',
				selector: 'pages=2-15',
			});

			expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
				pages: { startPage: 2, endPage: 11 },
			});
			expect(context.content).toEqual({
				type: 'text',
				text: 'Reference: /project/paper.pdf\n\nPDF materialization limited: requested pages 2-15, showing pages 2-11. Continue with selector "pages=12-15".\n\nfree pdf',
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('does not convert the whole PDF for reversed page ranges', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const { runtime } = await createReferenceRuntime({ filesystem });

		try {
			const context = await runtime.references.toContext({
				locator: '/project/paper.pdf',
				selector: 'pages=12-10',
			});

			expect(pdfMocks.freeConvertPDF).not.toHaveBeenCalled();
			expect(context.content).toEqual({
				type: 'text',
				text: 'Reference: /project/paper.pdf\n\nNo PDF pages selected: selector "pages=12-10" starts after it ends. Use pages=10-12 to read that range.',
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('uses Mistral when the runtime has a Mistral API key', async () => {
		const filesystem = new MemoryFilesystem();
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		filesystem.seed('/project/paper.pdf' as AbsolutePath, '%PDF-1.7\n');
		const renderScreenshots = vi.fn(async () => []);
		const { runtime } = await createReferenceRuntime({
			filesystem,
			auth: mockAuthManager('mis-key'),
			renderScreenshots,
		});

		try {
			const context = await runtime.references.toContext({
				locator: '/project/paper.pdf',
			});

			expect(pdfMocks.mistralConstructor).toHaveBeenCalledWith({
				apiKey: 'mis-key',
				renderScreenshots,
			});
			expect(pdfMocks.mistralConvertPDF).toHaveBeenCalledWith(pdf, {
				pages: { startPage: 1, endPage: 10 },
			});
			expect(pdfMocks.freeConvertPDF).not.toHaveBeenCalled();
			expect(context.content).toEqual({
				type: 'text',
				text: 'Reference: /project/paper.pdf\n\nPDF materialization limited: showing up to pages 1-10. Continue with selector "pages=11-20" if needed.\n\nmistral pdf',
			});
		} finally {
			await runtime.dispose();
		}
	});

	it('advertises the PDF selector format in the system prompt', async () => {
		const filesystem = new MemoryFilesystem();
		const { runtime, mock } = await createReferenceRuntime({
			filesystem,
		});

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'sync prompt' }],
				}),
			);

			expect(mock.context().systemPrompt).toContain(
				'Reading PDFs is supported.\nSupported selectors:\n- page=N\n- pages=N-M',
			);
		} finally {
			await runtime.dispose();
		}
	});
});
