export interface IpcPaths {
	forMethod(): string;
	forStream(): string;
	forOnSubscribe(): string;
	forOnUnsubscribe(): string;
	forOnEvent(subscriptionId: string): string;
	forConnect(): string;
	forKill(): string;
	forNamespace(key: string): string;
	forLease(id: string): string;
}

export function createPaths(prefix: string): IpcPaths {
	const join = (suffix: string) => (prefix ? `${prefix}:${suffix}` : suffix);
	const onBase = join('on');
	return {
		forMethod: () => prefix,
		forStream: () => join('stream'),
		forOnSubscribe: () => `${onBase}:subscribe`,
		forOnUnsubscribe: () => `${onBase}:unsubscribe`,
		forOnEvent: (subscriptionId: string) => `${onBase}:${subscriptionId}`,
		forConnect: () => join('connect'),
		forKill: () => join('kill'),
		forNamespace: (key: string) => join(key),
		forLease: (id: string) => join(`lease:${id}`),
	};
}
