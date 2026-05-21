import type { API, Signature } from '../api/types.js';

export type APITransformWith<Args extends unknown[] = []> = <
	S extends Signature,
	Runtime extends S['In'],
	Surface extends API<S, Runtime> = API<S, Runtime>,
>(
	...args: [...Args, api: Surface]
) => Surface;

export type APITransform = APITransformWith;
