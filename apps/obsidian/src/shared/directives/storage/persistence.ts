import { createSingleFilePersister } from '@franklin/lib';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { createNodeFilesystem } from '@franklin/node';
import { writeAtomic } from '../../persistence/write.js';
import { directiveCodec } from './codec.js';

type Options = { path: AbsolutePath; filesystem?: Filesystem };

export function createDirectivePersistence({
	path,
	filesystem = { ...createNodeFilesystem(), writeFile: writeAtomic },
}: Options) {
	return createSingleFilePersister(filesystem, path, directiveCodec);
}
