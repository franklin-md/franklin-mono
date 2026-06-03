import { createDependencyModule } from '@franklin/extensibility/module';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type JsonObject,
	type AbsolutePath,
} from '@franklin/lib';
import {
	createMockMiniACP,
	toolCalls,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import {
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	type AuthManager,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/agent';
import { createRuntime } from '@franklin/agent/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReadPDFToolExtension } from '../extension.js';
import type { PDFConverter, RenderPDFScreenshots } from '../../types.js';

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
		cwd: '/tmp' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function mockEnvironment(file: Uint8Array): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(async () => file),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async () => true),
			glob: vi.fn(async () => []),
			deleteFile: vi.fn(async () => {}),
			resolve: vi.fn(async (path: string) => path as AbsolutePath),
		},
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

async function executeReadPDF(input: {
	readonly file: Uint8Array;
	readonly auth?: AuthManager;
	readonly args: JsonObject;
	readonly renderScreenshots?: RenderPDFScreenshots;
}) {
	const auth = input.auth ?? mockAuthManager();
	const renderScreenshots = input.renderScreenshots ?? vi.fn(async () => []);
	const mock = createMockMiniACP({
		turns: [
			turn([
				toolCalls([{ name: 'read_pdf', arguments: input.args }]),
				turnEnd(),
			]),
		],
	});
	const module = buildStateExtensionModule([
		createCoreStateModule(mock.connector),
		createEnvironmentModule(async () => mockEnvironment(input.file)),
		createDependencyModule('auth', auth),
	]);
	const runtime = await createRuntime(
		module,
		{ ...module.emptyState(), env: defaultConfig },
		[createReadPDFToolExtension({ renderScreenshots })],
	);

	try {
		for await (const _event of runtime.prompt({
			role: 'user',
			content: [{ type: 'text', text: 'read pdf' }],
		})) {
			// Drain the mock turn so its tool call executes.
		}
		return { result: mock.calls().toolResults[0], auth, renderScreenshots };
	} finally {
		await runtime.dispose();
	}
}

describe('createReadPDFToolExtension', () => {
	beforeEach(() => {
		pdfMocks.freeConstructor.mockClear();
		pdfMocks.freeConvertPDF.mockReset();
		pdfMocks.mistralConstructor.mockClear();
		pdfMocks.mistralConvertPDF.mockReset();
		pdfMocks.freeConvertPDF.mockResolvedValue({
			markdown: 'free',
			screenshots: [],
		});
		pdfMocks.mistralConvertPDF.mockResolvedValue({
			markdown: 'mistral',
			screenshots: [],
		});
	});

	it('routes PDFs through the PDF converter with page ranges', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const auth = mockAuthManager();
		const renderScreenshots = vi.fn(async () => []);
		pdfMocks.freeConvertPDF.mockResolvedValue({
			markdown: 'converted pdf',
			screenshots: [],
		});

		const { result } = await executeReadPDF({
			file: pdf,
			auth,
			renderScreenshots,
			args: {
				path: 'document.pdf',
				start_page: 2,
				end_page: 4,
			},
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('mistral');
		expect(pdfMocks.freeConstructor).toHaveBeenCalledWith({
			renderScreenshots,
		});
		expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 2, endPage: 4 },
		});
		expect(pdfMocks.mistralConstructor).not.toHaveBeenCalled();
		expect(result?.content).toEqual([{ type: 'text', text: 'converted pdf' }]);
	});

	it('defaults missing page range boundaries', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');

		await executeReadPDF({
			file: pdf,
			args: {
				path: 'document.pdf',
				end_page: 4,
			},
		});

		expect(pdfMocks.freeConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: { startPage: 1, endPage: 4 },
		});
	});

	it('selects Mistral from the runtime auth dependency', async () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const auth = mockAuthManager('mis-key');
		const renderScreenshots = vi.fn(async () => []);

		const { result } = await executeReadPDF({
			file: pdf,
			auth,
			renderScreenshots,
			args: { path: 'document.pdf' },
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('mistral');
		expect(pdfMocks.mistralConstructor).toHaveBeenCalledWith({
			apiKey: 'mis-key',
			renderScreenshots,
		});
		expect(pdfMocks.mistralConvertPDF).toHaveBeenCalledWith(pdf, {
			pages: undefined,
		});
		expect(pdfMocks.freeConvertPDF).not.toHaveBeenCalled();
		expect(result?.content).toEqual([{ type: 'text', text: 'mistral' }]);
	});
});
