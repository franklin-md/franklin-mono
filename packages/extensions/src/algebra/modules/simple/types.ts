import type { API } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import type { ExtensionPoint } from '../../extension-points/types.js';
import type { BaseRuntime } from '../../runtime/index.js';

export type ExtensionModule<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
> = {
	readonly extensionPoint: ExtensionPoint<A>;
	readonly compiler: Compiler<A, Runtime>;
};

export type BaseExtensionModule = ExtensionModule<any, any>;
