export interface ChannelNamespace {
	getIpcStreamChannel(): string;
	getMethodChannel(path: readonly string[]): string;
	getLeaseConnectChannel(path: readonly string[]): string;
	getLeaseKillChannel(path: readonly string[]): string;
	getTransportStreamChannel(path: readonly string[]): string;
	getHandleMethodChannel(
		handlePath: readonly string[],
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

export function createChannels(name: string): ChannelNamespace {
	return {
		getMethodChannel: (path) => getChannel(name, path),

		getIpcStreamChannel: () => getChannel(name, [], 'ipc-stream'),
		getLeaseConnectChannel: (path) => getChannel(name, path, 'connect'),
		getLeaseKillChannel: (path) => getChannel(name, path, 'kill'),
		getTransportStreamChannel: (path) => getChannel(name, path, 'stream'),
		getHandleMethodChannel: (handlePath, memberPath) =>
			getChannel(name, [...handlePath, 'handle', ...memberPath]),
	};
}
