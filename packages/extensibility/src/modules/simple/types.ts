import type { Signature } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import type { ExtensionPoint } from '../../extension-points/types.js';
import type { BaseRuntime } from '../../runtime/index.js';

export type ExtensionModule<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
> = {
	readonly extensionPoint: ExtensionPoint<S>;
	readonly compiler: Compiler<S, Runtime>;
};

export type BaseExtensionModule = ExtensionModule<any, any>;
