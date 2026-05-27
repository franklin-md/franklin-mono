import { fileTypeFromBuffer } from 'file-type';
import type { AbsolutePath } from '@franklin/lib';
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

type FilesystemHandlerRuntime = ReferenceHandlerRuntime & EnvironmentRuntime;

const filesystemFileReferenceHandler: ReferenceHandler<FilesystemHandlerRuntime> =
	{
		test(reference) {
			return (
				reference.type === 'filesystem.file' && reference.data === undefined
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
				};
			}

			const bytes = await fs.readFile(path);
			const fileType = await fileTypeFromBuffer(bytes);
			const mime =
				fileType?.mime ?? (isPdfPath(path) ? 'application/pdf' : undefined);
			return delegate({
				...reference,
				data: {
					type: 'bytes',
					bytes,
					...(mime ? { mime } : {}),
				},
			});
		},
	};

export const filesystemFileReferenceExtension = defineExtension<
	[ReferencesModule, EnvironmentModule]
>((api) => {
	api.registerReferenceHandler(filesystemFileReferenceHandler);
});

function isPdfPath(path: AbsolutePath): boolean {
	return path.toLowerCase().endsWith('.pdf');
}
