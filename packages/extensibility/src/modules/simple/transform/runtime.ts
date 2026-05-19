import type { BaseRuntime } from '../../../runtime/types.js';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import { identityModule, type IdentitySignature } from '../identity.js';
import type { ExtensionModule } from '../types.js';

export type RuntimeModule<Runtime extends BaseRuntime> = ExtensionModule<
	IdentitySignature,
	Runtime
>;

export function liftRuntimeFactory<Runtime extends BaseRuntime>(
	createRuntime: () => MaybePromise<Runtime>,
): RuntimeModule<Runtime> {
	const module = identityModule();

	return {
		extensionPoint: module.extensionPoint,
		compiler: {
			async compile() {
				return createRuntime();
			},
		},
	};
}
