import { base64, decode } from '@franklin/lib';
import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { readFileSpec } from './tools.js';
import {
	detectFileType,
	isPDF,
	isSupportedImageType,
} from '../common/supported.js';

export function readExtension() {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(readFileSpec, {
				execute: async ({ path, limit, offset }, ctx) => {
					const fs = ctx.environment.filesystem;
					const file = createFileControl(ctx.getStore(fileKey));
					const absPath = await fs.resolve(path);
					const bytes = await fs.readFile(absPath);
					await file.markFileRead(fs, path, bytes);

					const ft = detectFileType(bytes);
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
									type: 'image' as const,
									data: base64(bytes),
									mimeType: ft.mime,
								},
							],
						};
					}

					if (isPDF(ft.mime)) {
						return {
							content: [
								{
									type: 'text' as const,
									text: 'PDF files are not supported by this reader.',
								},
							],
							isError: true,
						};
					}

					return {
						content: [
							{
								type: 'text' as const,
								text: `Unsupported file format: ${ft.mime}`,
							},
						],
						isError: true,
					};
				},
			});
		},
	);
}
