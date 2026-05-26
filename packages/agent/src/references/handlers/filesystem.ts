import { decode } from '@franklin/lib';
import { fileTypeFromBuffer } from 'file-type';
import type { AbsolutePath } from '@franklin/lib';
import type { EnvironmentRuntime } from '@franklin/extensions';
import type {
	ReferenceHandler,
	ReferenceHandlerRuntime,
} from '../api/index.js';
import { referenceUnavailable } from './unavailable.js';

type FilesystemFileLocator = {
	readonly path: string;
};

type FilesystemHandlerRuntime = ReferenceHandlerRuntime & EnvironmentRuntime;

export const filesystemFileReferenceHandler: ReferenceHandler<FilesystemHandlerRuntime> =
	{
		type: 'filesystem.file',
		async toContext(reference, ctx) {
			if (!isFilesystemFileLocator(reference.locator)) {
				return referenceUnavailable(
					'filesystem.file references require a locator with string path',
				);
			}

			const fs = ctx.environment.filesystem;
			const path = await fs.resolve(reference.locator.path);
			const stat = await fs.stat(path);
			if (!stat.isFile) {
				return referenceUnavailable(`Reference path is not a file: ${path}`);
			}

			const bytes = await fs.readFile(path);
			const fileType = await fileTypeFromBuffer(bytes);
			if (fileType?.mime === 'application/pdf' || isPdfPath(path)) {
				return ctx.references.toContext({
					type: 'pdf.document',
					locator: { path },
					...(reference.selector ? { selector: reference.selector } : {}),
					...(reference.label ? { label: reference.label } : {}),
				});
			}

			if (!fileType) {
				return ctx.references.toContext({
					type: 'text.document',
					locator: { text: decode(bytes), uri: path },
					...(reference.selector ? { selector: reference.selector } : {}),
					...(reference.label ? { label: reference.label } : {}),
				});
			}

			return {
				content: [
					{
						type: 'text',
						text: `Reference unavailable: ${reference.label ?? path}. Unsupported file format: ${fileType.mime}`,
					},
				],
			};
		},
	};

function isFilesystemFileLocator(
	locator: unknown,
): locator is FilesystemFileLocator {
	return (
		typeof locator === 'object' &&
		locator !== null &&
		'path' in locator &&
		typeof locator.path === 'string'
	);
}

function isPdfPath(path: AbsolutePath): boolean {
	return path.toLowerCase().endsWith('.pdf');
}
