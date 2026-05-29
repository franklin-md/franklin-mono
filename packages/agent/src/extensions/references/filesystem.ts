import { fileTypeFromBuffer } from 'file-type';
import type { AbsolutePath } from '@franklin/lib';
import type { CoreModule } from '../../modules/core/index.js';
import type {
	EnvironmentModule,
	EnvironmentRuntime,
} from '../../modules/environment/index.js';
import { defineExtension } from '../../modules/state/index.js';
import type {
	ReferenceHandler,
	ReferenceHandlerRuntime,
} from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';

export const FILESYSTEM_FILE_REFERENCE_TYPE = 'file';

type FilesystemHandlerRuntime = ReferenceHandlerRuntime & EnvironmentRuntime;

const filesystemFileReferenceHandler: ReferenceHandler<FilesystemHandlerRuntime> =
	{
		test(reference) {
			return (
				(reference.type === undefined ||
					reference.type === FILESYSTEM_FILE_REFERENCE_TYPE) &&
				reference.data === undefined
			);
		},
		async toContext(reference, delegate, runtime) {
			const fs = runtime.environment.filesystem;
			const path = await fs.resolve(reference.locator);
			const stat = await fs.stat(path);
			if (!stat.isFile) {
				return {
					content: [
						{
							type: 'text',
							text: `Reference unavailable: Reference path is not a file: ${path}`,
						},
					],
					isError: true,
				};
			}

			const bytes = await fs.readFile(path);
			const fileType = await fileTypeFromBuffer(bytes);
			// TODO(FRA-347): I would prefer a more robust bytes + path -> mime converter.
			const mime =
				fileType?.mime ?? (isPdfPath(path) ? 'application/pdf' : undefined);
			const context = await delegate({
				...reference,
				data: {
					type: 'bytes',
					bytes,
					...(mime ? { mime } : {}),
				},
			});
			return context;
		},
	};

export const filesystemFileReferenceExtension = defineExtension<
	[ReferencesModule, EnvironmentModule, CoreModule]
>((api) => {
	api.registerReferenceHandler(filesystemFileReferenceHandler);
	api.on('systemPrompt', (prompt) => {
		prompt.setPart(
			'Reading filesystem paths is supported. Locators are file paths resolved by the active environment; selectors are handled by the resolved content provider.',
			{ once: true },
		);
	});
});

function isPdfPath(path: AbsolutePath): boolean {
	return path.toLowerCase().endsWith('.pdf');
}
