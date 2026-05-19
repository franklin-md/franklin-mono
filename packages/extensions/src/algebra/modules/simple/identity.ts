import type { Signature } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { ExtensionModule } from './types.js';

export type IdentityAPI = Record<never, never>;

export interface IdentitySignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: IdentityAPI;
}

export type IdentityRuntime = BaseRuntime;

export type IdentityCompiler = Compiler<IdentitySignature, IdentityRuntime>;

export type IdentityModule = ExtensionModule<
	IdentitySignature,
	IdentityRuntime
>;

const identityExtensionPoint = createExtensionPoint<IdentitySignature>({});

export function identityAPI(): IdentityAPI {
	return {};
}

export function identityRuntime(): IdentityRuntime {
	return {
		async dispose(): Promise<void> {},
	};
}

export function identityCompiler(): IdentityCompiler {
	return {
		async compile() {
			return identityRuntime();
		},
	};
}

export function identityModule(): IdentityModule {
	return {
		extensionPoint: identityExtensionPoint,
		compiler: identityCompiler(),
	};
}
