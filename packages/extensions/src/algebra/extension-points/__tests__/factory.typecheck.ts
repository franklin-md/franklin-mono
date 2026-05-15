import { createExtensionPoint } from '../create.js';
import type { CoreAPI } from '../../../modules/core/api/api.js';
import type { IdentityAPI } from '../../modules/simple/identity.js';
import type { StoreAPI } from '../../../modules/store/api/api.js';

createExtensionPoint<CoreAPI>({
	on: true,
	registerTool: true,
});

// @ts-expect-error core extension point must list every contribution key
createExtensionPoint<CoreAPI>({
	on: true,
});

createExtensionPoint<CoreAPI>({
	on: true,
	registerTool: true,
	// @ts-expect-error core extension point cannot list store keys
	registerStore: true,
});

createExtensionPoint<StoreAPI>({
	registerStore: true,
});

// @ts-expect-error store extension point must list registerStore
createExtensionPoint<StoreAPI>({});

createExtensionPoint<IdentityAPI>({});

createExtensionPoint<IdentityAPI>({
	// @ts-expect-error identity extension point has no contribution keys
	on: true,
});
