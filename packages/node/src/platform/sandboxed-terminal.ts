import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';
import type { Terminal, TerminalInput } from '@franklin/lib';
import type {
	NetworkConfig,
	FilesystemConfig,
	EnvironmentConfig,
} from '@franklin/extensions';
import { once } from 'events';

export class SandboxedTerminal implements Terminal {
	private _cwd: string;
	private _app_dir: string;
	private _config: SandboxRuntimeConfig;

	async setNetworkConfig(config: NetworkConfig) {
		this._config.network = { ...config };
		await SandboxManager.initialize(this._config);
	}

	getNetworkConfig() {
		return this._config.network as NetworkConfig;
	}

	async setFilesystemConfig(config: Partial<FilesystemConfig>) {
		if (config.cwd) {
			this._cwd = config.cwd;
		}
		if (config.permissions) {
			this._config.filesystem.allowRead = config.permissions.allowRead;
			this._config.filesystem.allowWrite = config.permissions.allowWrite;
			this._config.filesystem.denyWrite = [
				`${this._app_dir}/auth.json`,
				`${this._app_dir}/sessions`,
				`${this._app_dir}/store`,
			];
		}
		await SandboxManager.initialize(this._config);
	}

	constructor(app_dir: string, config: EnvironmentConfig) {
		this._cwd = config.fsConfig.cwd;
		this._app_dir = app_dir;

		this._config = {
			network: { ...config.netConfig },
			filesystem: {
				denyRead: ['/'],
				allowRead: config.fsConfig.permissions.allowRead,
				allowWrite: config.fsConfig.permissions.allowWrite,
				denyWrite: [
					`${this._app_dir}/auth.json`,
					`${this._app_dir}/sessions`,
					`${this._app_dir}/store`,
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
		//TODO: block command if it calls sudo
		const sandboxedCommand = await SandboxManager.wrapWithSandbox(cmd);

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
