import type { Filesystem } from '@franklin/lib';
import type { Store } from '../../../modules/store/api/types.js';
import type { FileRecord } from '../common/key.js';
import { createFileControl } from '../common/control.js';

type Options = {
	filesystem: Filesystem;
	store: Store<FileRecord>;
	path: string;
	content: string;
};

export async function writeFile({ filesystem, store, path, content }: Options) {
	const absolutePath = await filesystem.resolve(path);
	await filesystem.writeFile(absolutePath, content);
	await createFileControl(store).markFileRead(filesystem, path, content);
	return absolutePath;
}
