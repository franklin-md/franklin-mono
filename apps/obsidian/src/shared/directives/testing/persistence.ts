import {
	MemoryFilesystem,
	createSingleFilePersister,
	toAbsolutePath,
} from '@franklin/lib';
import { directiveCodec } from '../storage/codec.js';

export function createDirectiveTestPersistence(
	filesystem = new MemoryFilesystem(),
) {
	return createSingleFilePersister(
		filesystem,
		toAbsolutePath('/directives.json'),
		directiveCodec,
	);
}
