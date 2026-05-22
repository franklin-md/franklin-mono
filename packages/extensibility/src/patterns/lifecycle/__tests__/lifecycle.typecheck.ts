import type { Extension } from '../../../extension/types.js';
import { createLifecycleModule } from '../module.js';
import type { LifecycleAPI, LifecycleUnload } from '../types.js';

const _module = createLifecycleModule();
void _module.extensionPoint;
void _module.compiler;

const _syncUnload: LifecycleUnload = () => {};
const _asyncUnload: LifecycleUnload = async () => {};
// @ts-expect-error unload handlers cannot receive runtime
const _runtimeUnload: LifecycleUnload = (_runtime: unknown) => {};

const _extension: Extension<LifecycleAPI> = (api) => {
	api.onUnload(() => {});
	api.onUnload(async () => {});
	// @ts-expect-error onUnload requires an unload handler
	api.onUnload();
	// @ts-expect-error onUnload handlers cannot receive runtime
	api.onUnload((_runtime: unknown) => {});
	// @ts-expect-error unload handlers must not return a value
	api.onUnload(() => 'value');
};

void _syncUnload;
void _asyncUnload;
void _runtimeUnload;
void _extension;
