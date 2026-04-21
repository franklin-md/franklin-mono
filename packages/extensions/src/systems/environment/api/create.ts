import type { Filesystem, OsInfo, Terminal } from '@franklin/lib';
import type {
	EnvironmentConfig,
	FilesystemConfig,
	NetworkConfig,
	ReconfigurableEnvironment,
	WebAPI,
} from './types.js';

export type ConfigureOptions<
	F extends Filesystem = Filesystem,
	T extends Terminal = Terminal,
	W extends WebAPI = WebAPI,
> = {
	config: EnvironmentConfig;
	osInfo: OsInfo;
	configureFilesystem: (
		config: FilesystemConfig,
		previous: F | undefined,
	) => Promise<F>;
	configureTerminal: (
		config: EnvironmentConfig,
		previous: T | undefined,
	) => Promise<T>;
	configureWeb: (config: NetworkConfig, previous: W | undefined) => Promise<W>;
	dispose?: (current: { filesystem: F; terminal: T; web: W }) => Promise<void>;
};

export async function createReconfigurableEnvironment<
	F extends Filesystem = Filesystem,
	T extends Terminal = Terminal,
	W extends WebAPI = WebAPI,
>(opts: ConfigureOptions<F, T, W>): Promise<ReconfigurableEnvironment> {
	let currentConfig: EnvironmentConfig = {
		fsConfig: {
			...opts.config.fsConfig,
			permissions: { ...opts.config.fsConfig.permissions },
		},
		netConfig: { ...opts.config.netConfig },
	};

	let currentFs: F = await opts.configureFilesystem(
		currentConfig.fsConfig,
		undefined,
	);
	let currentTerminal: T = await opts.configureTerminal(
		currentConfig,
		undefined,
	);
	let currentWeb: W = await opts.configureWeb(
		currentConfig.netConfig,
		undefined,
	);

	const filesystem: Filesystem = {
		resolve: (...paths) => currentFs.resolve(...paths),
		readFile: (path) => currentFs.readFile(path),
		writeFile: (path, data) => currentFs.writeFile(path, data),
		mkdir: (path, options) => currentFs.mkdir(path, options),
		access: (path) => currentFs.access(path),
		stat: (path) => currentFs.stat(path),
		readdir: (path) => currentFs.readdir(path),
		exists: (path) => currentFs.exists(path),
		glob: (pattern, options) => currentFs.glob(pattern, options),
		deleteFile: (path) => currentFs.deleteFile(path),
	};

	const terminal: Terminal = {
		exec: (input) => currentTerminal.exec(input),
	};

	const web: WebAPI = {
		fetch: (request) => currentWeb.fetch(request),
	};

	return {
		filesystem,
		terminal,
		web,
		osInfo: opts.osInfo,

		async config() {
			return currentConfig;
		},

		async reconfigure(partial) {
			const merged: EnvironmentConfig = {
				fsConfig: partial.fsConfig ?? currentConfig.fsConfig,
				netConfig: partial.netConfig ?? currentConfig.netConfig,
			};
			currentFs = await opts.configureFilesystem(merged.fsConfig, currentFs);
			currentTerminal = await opts.configureTerminal(merged, currentTerminal);
			currentWeb = await opts.configureWeb(merged.netConfig, currentWeb);
			currentConfig = merged;
		},

		async dispose() {
			await opts.dispose?.({
				filesystem: currentFs,
				terminal: currentTerminal,
				web: currentWeb,
			});
		},
	};
}
