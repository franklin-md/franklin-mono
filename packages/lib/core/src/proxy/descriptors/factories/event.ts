import type { EventDescriptor } from '../types/event.js';
import { EVENT_KIND } from '../types/event.js';

type AnyEventMethod = (...args: any[]) => AsyncIterable<any>;

export function event<TMethod extends AnyEventMethod>(): EventDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>> extends AsyncIterable<infer TItem>
		? TItem
		: never
> {
	return { kind: EVENT_KIND };
}
