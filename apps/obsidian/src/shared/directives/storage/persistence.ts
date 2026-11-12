import { createSingleFilePersister } from '@franklin/lib';
import type {
	AbsolutePath,
	Filesystem,
	SingleFilePersister,
} from '@franklin/lib';
import { writeAtomic } from '../../persistence/write.js';
import { directiveCodec } from './codec.js';
import type { DirectiveDocument } from './types.js';

type Options = { filesystem: Filesystem; path: AbsolutePath };

export function createDirectivePersistence({
	filesystem,
	path,
}: Options): SingleFilePersister<DirectiveDocument> {
	const persister = createSingleFilePersister(filesystem, path, directiveCodec);
	return {
		...persister,
		save: (document) =>
			writeAtomic(path, JSON.stringify(directiveCodec.encode(document))),
	};
}
