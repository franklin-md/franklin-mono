import type { API } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { ExtensionModule } from './types.js';

export type IdentityAPISurface = Record<never, never>;

export interface IdentityAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: IdentityAPISurface;
}

export type IdentityRuntime = BaseRuntime;

export type IdentityCompiler = Compiler<IdentityAPI, IdentityRuntime>;

export type IdentityModule = ExtensionModule<IdentityAPI, IdentityRuntime>;

const identityExtensionPoint = createExtensionPoint<IdentityAPI>({});

export function identityAPI(): IdentityAPISurface {
	return {};
}

export function identityRuntime(): IdentityRuntime {
	return {
		async dispose(): Promise<void> {},
		subscribe(): () => void {
			return () => {};
		},
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
