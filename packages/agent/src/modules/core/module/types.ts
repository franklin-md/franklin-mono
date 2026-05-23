import type { ExtensionModule } from '@franklin/extensibility/module';

import type { CoreSignature } from '../api/api.js';
import type { CoreRuntime } from '../runtime/index.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during module composition.
 */
export type CoreModule = ExtensionModule<CoreSignature, CoreRuntime>;
