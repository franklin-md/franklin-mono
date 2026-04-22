import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';
import { delimiter } from 'path';
import type {
	AbsolutePath,
	NetworkPermissions,
	Terminal,
	TerminalInput,
} from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { FilesystemConfig, EnvironmentConfig } from '@franklin/extensions';
import { once } from 'events';

export class SandboxedTerminal implements Terminal {
	private _cwd: string;
	private _app_dir: AbsolutePath;
	private _config: SandboxRuntimeConfig;
	private _paths: string[];

	private getPathsFromEnv() {
		return (process.env.PATH ?? '')
			.split(delimiter)
			.filter((path) => path.length > 0);
	}

	async setNetworkConfig(config: NetworkPermissions) {
		this._config.network = { ...config };
		await SandboxManager.initialize(this._config);
	}

	getNetworkConfig() {
		return this._config.network as NetworkPermissions;
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
		await SandboxManager.initialize(this._config);
	}

	constructor(app_dir: AbsolutePath, config: EnvironmentConfig) {
		this._cwd = config.fsConfig.cwd;
		this._app_dir = app_dir;
		// Paths to executables
		this._paths = this.getPathsFromEnv();

		this._config = {
			network: { ...config.netConfig },
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
		// Initialize the sandbox (starts proxy servers, etc.)
		await SandboxManager.initialize(this._config);
	}

	async exec({ cmd, timeout }: TerminalInput) {
		// Wrap a command with sandbox restrictions
		const sandboxedCommand = await SandboxManager.wrapWithSandbox(
			cmd,
			undefined,
			this._config,
		);

		// Execute the sandboxed command
		// TODO: we should have a way of managing environment variables
		const child = spawn(sandboxedCommand, {
			shell: true,
			stdio: 'pipe',
			cwd: this._cwd,
			timeout,
		});

		// Collect output
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

		// Handle exit and cleanup after child process completes
		const [code] = await once(child, 'exit');
		await SandboxManager.reset();

		return {
			exit_code: code as number,
			stdout: Buffer.concat(stdout).toString(),
			stderr: Buffer.concat(stderr).toString(),
		};
	}
}
