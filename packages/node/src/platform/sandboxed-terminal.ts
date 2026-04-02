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
	private _config: SandboxRuntimeConfig;

	setCwd(cwd: string) {
		this._cwd = cwd;
		this._config.filesystem.denyWrite = [
			'.env',
			`${cwd}/auth.json`,
			`${cwd}/sessions`,
			`${cwd}/store`,
		];
	}

	setNetworkConfig(config: NetworkConfig) {
		this._config.network = { ...config };
	}

	getNetworkConfig() {
		return this._config.network as NetworkConfig;
	}

	setFilesystemConfig(config: Partial<FilesystemConfig>) {
		if (config.cwd) {
			this.setCwd(config.cwd);
		}
		if (config.permissions) {
			const cwd = this._cwd;
			this._config.filesystem.allowRead = config.permissions.allowRead;
			this._config.filesystem.allowWrite = config.permissions.allowWrite;
			this._config.filesystem.denyWrite = [
				'.env',
				`${cwd}/auth.json`,
				`${cwd}/sessions`,
				`${cwd}/store`,
			];
		}
	}

	constructor(config: EnvironmentConfig) {
		const cwd = config.fsConfig.cwd;
		this._config = {
			network: { ...config.netConfig },
			filesystem: {
				denyRead: ['/'],
				allowRead: config.fsConfig.permissions.allowRead,
				allowWrite: config.fsConfig.permissions.allowWrite,
				denyWrite: [
					'.env',
					`${cwd}/auth.json`,
					`${cwd}/sessions`,
					`${cwd}/store`,
				],
			},
		};
		this._cwd = cwd;
	}

	async exec({ cmd, timeout }: TerminalInput) {
		// Initialize the sandbox (starts proxy servers, etc.)
		await SandboxManager.initialize(this._config);

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
