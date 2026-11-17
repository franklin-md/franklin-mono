import type { SandboxConfig } from './scheduler/types.js';
import { delimiter } from 'path';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import type { AbsolutePath, Process, ProcessInput } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { NetworkPermissions } from '@franklin/lib';
import type { FilesystemConfig, EnvironmentConfig } from '@franklin/agent';
import { sandboxScheduler } from './runtime.js';

export class SandboxedProcess implements Process {
	private _cwd: string;
	private _app_dir: AbsolutePath;
	private _config: SandboxConfig;
	private _paths: string[];

	private getPathsFromEnv() {
		return (process.env.PATH ?? '')
			.split(delimiter)
			.filter((path) => path.length > 0);
	}

	async setNetworkConfig(config: NetworkPermissions) {
		this._config.network = structuredClone(config);
	}

	getNetworkConfig() {
		return structuredClone(this._config.network) as NetworkPermissions;
	}

	private _denyWritePaths(): string[] {
		return [
			joinAbsolute(this._app_dir, 'auth.json'),
			joinAbsolute(this._app_dir, 'sessions'),
			joinAbsolute(this._app_dir, 'store'),
		];
	}

	async setFilesystemConfig(config: Partial<FilesystemConfig>) {
		if (config.cwd) {
			this._cwd = config.cwd;
		}
		if (config.permissions) {
			this._config.filesystem.allowRead = [
				...config.permissions.allowRead,
				...this._paths,
			];
			this._config.filesystem.denyRead = [...config.permissions.denyRead];
			this._config.filesystem.allowWrite = [...config.permissions.allowWrite];
			this._config.filesystem.denyWrite = [
				...config.permissions.denyWrite,
				...this._denyWritePaths(),
			];
		}
	}

	constructor(app_dir: AbsolutePath, config: EnvironmentConfig) {
		this._cwd = config.fsConfig.cwd;
		this._app_dir = app_dir;
		// Paths to executables
		this._paths = this.getPathsFromEnv();

		this._config = {
			network: structuredClone(config.netConfig),
			filesystem: {
				denyRead: [...config.fsConfig.permissions.denyRead],
				allowRead: [...config.fsConfig.permissions.allowRead, ...this._paths],
				allowWrite: [...config.fsConfig.permissions.allowWrite],
				denyWrite: [
					...config.fsConfig.permissions.denyWrite,
					...this._denyWritePaths(),
				],
			},
		};
	}
	async initialize() {
		// Runtime ownership starts at exec, so creating/reconfiguring an idle agent
		// cannot replace another agent's process-global sandbox policy.
		await access(tmpdir(), constants.W_OK);
	}

	exec(input: ProcessInput) {
		return sandboxScheduler.schedule({
			input: { ...input, cwd: input.cwd ?? this._cwd },
			config: this._config,
		});
	}
}
