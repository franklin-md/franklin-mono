import type { Sandbox } from '../../api/sandbox/types.js';
import type { SandboxAPI } from '../../api/sandbox/api.js';
import type { Compiler } from '../types.js';

export interface SandboxResult {
	sandbox: Sandbox;
}

/**
 * Create a compiler that provides a Sandbox to extensions.
 *
 * Unlike CoreCompiler (where extensions register handlers) or
 * StoreCompiler (where extensions register stores), the sandbox
 * compiler is a **provider**: extensions consume the sandbox via
 * `api.getSandbox()`, they don't contribute to it.
 */
export function createSandboxCompiler(
	sandbox: Sandbox,
): Compiler<SandboxAPI, SandboxResult> {
	return {
		api: {
			getSandbox: () => sandbox,
		},
		async build() {
			return { sandbox };
		},
	};
}
