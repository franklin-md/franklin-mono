import type { Backend, GrepBackendKind } from './types.js';
import { grepBackend } from './grep/index.js';
import { ripgrepBackend } from './ripgrep/index.js';

export function createBackend(kind: GrepBackendKind): Backend | undefined {
	switch (kind) {
		case 'ripgrep':
			return ripgrepBackend();
		case 'grep':
			return grepBackend();
		case 'none':
			return undefined;
	}
}
