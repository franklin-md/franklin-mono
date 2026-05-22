import type { API, BaseAPI, Signature } from '../api/types.js';
import type { Extension } from '../extension/types.js';

export type APITransformWith<Args extends unknown[] = []> = <
	S extends Signature,
	Runtime extends S['In'],
>(
	...args: [...Args, api: API<S, Runtime>]
) => API<S, Runtime>;

export type APITransform = APITransformWith;

export type ExtensionTransformWith<Args extends unknown[] = []> = <
	TAPI extends BaseAPI,
>(
	...args: [...Args, extension: Extension<TAPI>]
) => Extension<TAPI>;

export type ExtensionTransform = ExtensionTransformWith;
