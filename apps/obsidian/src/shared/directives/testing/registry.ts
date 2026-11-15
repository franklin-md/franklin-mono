import { MemoryFilesystem, toAbsolutePath } from '@franklin/lib';
import type { App } from 'obsidian';
import { DirectiveRegistry } from '../registry.js';
import { createDirectivePersistence } from '../storage/persistence.js';

export function createDirectiveTestPersistence(
	filesystem = new MemoryFilesystem(),
) {
	return createDirectivePersistence({
		filesystem,
		path: toAbsolutePath('/directives.json'),
	});
}

export function createDirectiveTestRegistry(
	app = {} as App,
	persistence = createDirectiveTestPersistence(),
) {
	return DirectiveRegistry.create({ app, persistence });
}
