export interface ChannelNamespace {
	getIpcStreamChannel(): string;
	getMethodChannel(path: readonly string[]): string;
	getLeaseConnectChannel(path: readonly string[]): string;
	getLeaseKillChannel(path: readonly string[]): string;
	getDuplexStreamChannel(path: readonly string[]): string;
	getLeaseMethodChannel(
		leasePath: readonly string[],
		memberPath: readonly string[],
	): string;
}

function getChannel(
	name: string,
	path: readonly string[],
	suffix?: string,
): string {
	return suffix == null
		? [name, ...path].join(':')
		: [name, ...path, suffix].join(':');
}

	return {

		getIpcStreamChannel: () => getChannel(name, [], 'ipc-stream'),
		getLeaseConnectChannel: (path) => getChannel(name, path, 'connect'),
		getLeaseKillChannel: (path) => getChannel(name, path, 'kill'),
		getDuplexStreamChannel: (path) => getChannel(name, path, 'stream'),
		getLeaseMethodChannel: (leasePath, memberPath) =>
			getChannel(name, [...leasePath, 'lease', ...memberPath]),
	};
}
