export interface IpcPaths {
	forMethod(): string;
	forStream(): string;
	forConnect(): string;
	forKill(): string;
	forNamespace(key: string): string;
	forLease(id: string): string;
}

export function createPaths(prefix: string): IpcPaths {
	const join = (suffix: string) => (prefix ? `${prefix}:${suffix}` : suffix);
	return {
		forMethod: () => prefix,
		forStream: () => join('stream'),
		forConnect: () => join('connect'),
		forKill: () => join('kill'),
		forNamespace: (key: string) => join(key),
		forLease: (id: string) => join(`lease:${id}`),
	};
}
