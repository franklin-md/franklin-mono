export interface ChannelNamespace {
	getIpcStreamChannel(): string;
	getMethodChannel(path: readonly string[]): string;
	getTransportConnectChannel(path: readonly string[]): string;
	getTransportKillChannel(path: readonly string[]): string;
	getTransportStreamChannel(path: readonly string[]): string;
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
		getTransportConnectChannel: (path) => getChannel(name, path, 'connect'),
		getTransportKillChannel: (path) => getChannel(name, path, 'kill'),
		getTransportStreamChannel: (path) => getChannel(name, path, 'stream'),
	};
}
