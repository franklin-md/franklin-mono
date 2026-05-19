import { fileTypeFromBuffer } from 'file-type';
import { defineExtension } from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { createFileControl } from '../filesystem/common/control.js';
import { fileKey } from '../filesystem/common/key.js';
import { isPDF } from '../filesystem/common/supported.js';
import { convertPDF } from './convert.js';
import { readPDFSpec } from './tools.js';
import type { PDFConverter, PDFPageRange } from './types.js';

export function readPDFExtension(pdfConverter: PDFConverter) {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(
				readPDFSpec,
				async ({ path, start_page, end_page }, ctx) => {
					const fs = ctx.environment.filesystem;
					const file = createFileControl(ctx.getStore(fileKey));
					const absPath = await fs.resolve(path);
					const bytes = await fs.readFile(absPath);
					await file.markFileRead(fs, path, bytes);

					const ft = await fileTypeFromBuffer(bytes);
					if (!ft || !isPDF(ft.mime)) {
						return {
							content: [
								{
									type: 'text',
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
				},
			);
		},
	);
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
