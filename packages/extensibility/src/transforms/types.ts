import type { API, Signature } from '../api/types.js';

export type APITransformWith<Args extends unknown[] = []> = <
	S extends Signature,
	Runtime extends S['In'],
>(
	...args: [...Args, api: API<S, Runtime>]
) => API<S, Runtime>;

export type APITransform = APITransformWith;
