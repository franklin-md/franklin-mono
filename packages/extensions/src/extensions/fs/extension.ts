import type { CoreAPI } from '../../api/core/api.js';
import type { SandboxAPI } from '../../api/sandbox/api.js';
import type { Extension } from '../../types/extension.js';
import { reduceExtensions } from '../../types/extension.js';
import { readExtension } from './read/extension.js';
import { writeExtension } from './write/extension.js';
import { editExtension } from './edit/extension.js';
import { grepExtension } from './grep/extension.js';
import { findExtension } from './find/extension.js';
import { lsExtension } from './ls/extension.js';

/**
 * Extension that registers filesystem tools (read, write, edit, grep, find, ls)
 * backed by the sandbox's Filesystem handle.
 *
 * Composed from individual micro-extensions — one per tool.
 */
export function fsExtension(): Extension<CoreAPI & SandboxAPI> {
	return reduceExtensions(
		readExtension(),
		writeExtension(),
		editExtension(),
		grepExtension(),
		findExtension(),
		lsExtension(),
	);
}
