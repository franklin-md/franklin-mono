import { fileTypeFromBuffer } from 'file-type';
import type { ReduceRuntimes } from '@franklin/extensibility';
import type {
	ExtensionForModules,
	ModuleRuntimes,
} from '../../modules/state/index.js';
import { defineExtension } from '../../modules/state/index.js';
import type { AuthDependencyModule } from '../../auth/dependency.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import { isPDF } from '../filesystem/common/supported.js';
import { convertPDF } from './convert.js';
import { createPDFConverterResolver } from './resolve-converter.js';
import { readPDFSpec } from './tools.js';
import type {
	PDFConverter,
	PDFPageRange,
	ReadPDFExtensionOptions,
} from './types.js';

type ReadPDFModules = [
	CoreModule,
	EnvironmentModule,
	// TODO(FRA-348): Is this the right Dependency? Do we maybe want something like SettingsModule?
	// Or what about ConfigurationModule, and you just sync settings as a configuraiton overide?
	AuthDependencyModule,
];

type ReadPDFCtx = ReduceRuntimes<ModuleRuntimes<ReadPDFModules>>;

export function readPDFExtension({
	renderScreenshots,
}: ReadPDFExtensionOptions): ExtensionForModules<ReadPDFModules> {
	const resolvePDFConverter = createPDFConverterResolver({ renderScreenshots });

	return defineExtension<ReadPDFModules>((api) => {
		api.registerTool(readPDFSpec, {
			execute: async (args, ctx) => {
				const pdfConverter = await resolvePDFConverter(ctx);
				return readPDF(pdfConverter, args, ctx);
			},
		});
	});
}

type ReadPDFArgs = {
	readonly path: string;
	readonly start_page?: number;
	readonly end_page?: number;
};

async function readPDF(
	pdfConverter: PDFConverter,
	{ path, start_page, end_page }: ReadPDFArgs,
	ctx: ReadPDFCtx,
) {
	const fs = ctx.environment.filesystem;
	const absPath = await fs.resolve(path);
	const bytes = await fs.readFile(absPath);
	// TODO: Consider tracking which PDF pages were read if that becomes useful context for future prompts.

	const ft = await fileTypeFromBuffer(bytes);
	if (!ft || !isPDF(ft.mime)) {
		return {
			content: [
				{
					type: 'text' as const,
					text: ft
						? `Unsupported file format for read_pdf: ${ft.mime}`
						: 'Unsupported file format for read_pdf: use read_file instead',
				},
			],
			isError: true,
		};
	}

	return convertPDF(bytes, {
		converter: pdfConverter,
		pages: toPDFPageRange(start_page, end_page),
	});
}

function toPDFPageRange(
	startPage: number | undefined,
	endPage: number | undefined,
): PDFPageRange | undefined {
	if (startPage === undefined && endPage === undefined) {
		return undefined;
	}
	return { startPage: startPage ?? 1, endPage };
}
