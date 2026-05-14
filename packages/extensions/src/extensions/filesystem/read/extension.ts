import { base64, decode } from '@franklin/lib';
import { fileTypeFromBuffer } from 'file-type';
import { defineExtension } from '../../../harness/modules/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { readFileSpec } from './tools.js';
import { isPDF, isSupportedImageType } from '../common/supported.js';
import { convertPDF } from '../pdf/convert.js';
import type { PDFConverter } from '../pdf/types.js';
export interface ReadExtensionOptions {
	readonly pdfConverter?: PDFConverter;
}

export function readExtension(options: ReadExtensionOptions = {}) {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(
				readFileSpec,
				async ({ path, limit, offset, pages }, ctx) => {
					const fs = ctx.environment.filesystem;
					const file = createFileControl(ctx.getStore(fileKey));
					const absPath = await fs.resolve(path);
					const bytes = await fs.readFile(absPath);
					await file.markFileRead(fs, path, bytes);

					const ft = await fileTypeFromBuffer(bytes);
					if (!ft) {
						// If there are no magic bytes at the beginning, assume text.
						const lines = decode(bytes).split('\n');
						const start = (offset ?? 1) - 1;
						return lines.slice(start, start + limit).join('\n');
					}

					if (isSupportedImageType(ft.mime)) {
						return {
							content: [
								{
									type: 'image',
									data: base64(bytes),
									mimeType: ft.mime,
								},
							],
						};
					}

					if (isPDF(ft.mime)) {
						return convertPDF(bytes, {
							converter: options.pdfConverter,
							pages: pages
								? { startPage: pages[0], endPage: pages[1] }
								: undefined,
						});
					}

					return {
						content: [
							{
								type: 'text',
								text: `Unsupported file format: ${ft.mime}`,
							},
						],
						isError: true,
					};
				},
			);
		},
	);
}
