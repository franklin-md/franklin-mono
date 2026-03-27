import type { StreamDescriptor } from '../types/stream.js';
import { STREAM_KIND } from '../types/stream.js';

export function stream<TRead = unknown, TWrite = TRead>(): StreamDescriptor<
	TRead,
	TWrite
> {
	return { kind: STREAM_KIND };
}

