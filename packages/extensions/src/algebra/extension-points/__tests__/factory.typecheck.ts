import { createExtensionPoint } from '../create.js';
import type { CoreSignature } from '../../../modules/core/api/api.js';
import type { IdentitySignature } from '../../modules/simple/identity.js';
import type { StoreSignature } from '../../../modules/store/api/api.js';

createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

// @ts-expect-error core extension point must list every contribution key
createExtensionPoint<CoreSignature>({
	on: true,
});

createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
	// @ts-expect-error core extension point cannot list store keys
	registerStore: true,
});

createExtensionPoint<StoreSignature>({
	registerStore: true,
});

// @ts-expect-error store extension point must list registerStore
createExtensionPoint<StoreSignature>({});

createExtensionPoint<IdentitySignature>({});

createExtensionPoint<IdentitySignature>({
	// @ts-expect-error identity extension point has no contribution keys
	on: true,
});
