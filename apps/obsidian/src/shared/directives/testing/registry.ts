import type { App } from 'obsidian';
import { DirectiveRegistry } from '../registry.js';
import { createDirectiveTestPersistence } from './persistence.js';

export function createDirectiveTestRegistry(
	app = {} as App,
	persistence = createDirectiveTestPersistence(),
) {
	return DirectiveRegistry.create({ app, persistence });
}
