import type { ReadonlyStore } from '@franklin/agent';
import { createObserver } from '@franklin/lib';

export type SharedThrottledStoreOptions = {
	readonly throttleMs: number;
};

const throttledStores = new WeakMap<
	ReadonlyStore<unknown>,
	Map<number, ReadonlyStore<unknown>>
>();

function normalizeThrottleMs(throttleMs: number): number {
	return Math.max(0, throttleMs);
}

function createThrottledStore<T>(
	source: ReadonlyStore<T>,
	throttleMs: number,
): ReadonlyStore<T> {
	let published = source.get();
	let latest = published;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	let unsubscribeSource: (() => void) | undefined;
	let subscriberCount = 0;
	const observer = createObserver<[T]>();

	const publish = () => {
		timeout = undefined;
		if (Object.is(published, latest)) return;

		published = latest;
		observer.notify(published);
	};

	const schedulePublish = () => {
		if (throttleMs <= 0) {
			publish();
			return;
		}

		if (timeout !== undefined) return;
		timeout = setTimeout(publish, throttleMs);
	};

	const clearScheduledPublish = () => {
		if (timeout === undefined) return;
		clearTimeout(timeout);
		timeout = undefined;
	};

	const start = () => {
		if (unsubscribeSource !== undefined) return;

		published = source.get();
		latest = published;
		unsubscribeSource = source.subscribe((value) => {
			latest = value;
			schedulePublish();
		});
	};

	const stop = () => {
		unsubscribeSource?.();
		unsubscribeSource = undefined;
		clearScheduledPublish();
	};

	return {
		get() {
			if (unsubscribeSource === undefined) return source.get();
			return published;
		},
		subscribe(listener) {
			subscriberCount++;
			start();
			const unsubscribeObserver = observer.subscribe(listener);

			return () => {
				unsubscribeObserver();
				subscriberCount--;
				if (subscriberCount === 0) stop();
			};
		},
	};
}

export function getSharedThrottledStore<T>(
	source: ReadonlyStore<T>,
	options: SharedThrottledStoreOptions,
): ReadonlyStore<T> {
	const throttleMs = normalizeThrottleMs(options.throttleMs);
	let storesByThrottle = throttledStores.get(source as ReadonlyStore<unknown>);

	if (storesByThrottle === undefined) {
		storesByThrottle = new Map();
		throttledStores.set(source as ReadonlyStore<unknown>, storesByThrottle);
	}

	const existing = storesByThrottle.get(throttleMs);
	if (existing !== undefined) return existing as ReadonlyStore<T>;

	const throttled = createThrottledStore(source, throttleMs);
	storesByThrottle.set(throttleMs, throttled as ReadonlyStore<unknown>);
	return throttled;
}
