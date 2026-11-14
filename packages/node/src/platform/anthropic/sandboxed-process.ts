import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';
import { once } from 'events';
import { delimiter } from 'path';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { quote as quoteArgv } from 'shell-quote';
import type { AbsolutePath, Process, ProcessInput } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { NetworkPermissions } from '@franklin/lib';
import type { FilesystemConfig, EnvironmentConfig } from '@franklin/agent';
import { acquireSandboxRuntime } from './runtime.js';

export class SandboxedProcess implements Process {
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

	async exec({ file, args, cwd, env, timeout }: ProcessInput) {
		const config = structuredClone(this._config);
		const permissions = config.network as NetworkPermissions;
		config.network = { allowedDomains: [], deniedDomains: [] };
		const workingDirectory = cwd ?? this._cwd;
		const tempDirectory = tmpdir();
		await access(tempDirectory, constants.W_OK);
		const release = await acquireSandboxRuntime(config, permissions);
		try {
			// SandboxManager.wrapWithSandbox takes a shell-string and returns a
			// shell-string (e.g. `sandbox-exec -p <policy> /bin/sh -c "..."`), which
			// must ultimately be run through `shell: true`. We POSIX-quote the argv
			// here so the shell reassembles the exact argv we were given — callers
			// never have to shell-escape themselves.
			// SRT overrides the outer TMPDIR with /tmp/claude, which may not exist.
			// Rebind the existing OS temp directory inside the sandbox; its configured
			// filesystem policy still decides whether the command may write there.
			const shellCmd = quoteArgv([
				'env',
				`TMPDIR=${tempDirectory}`,
				// SRT's NO_PROXY bypasses the proxy for loopback/private hosts, whose
				// direct sockets are sandbox-blocked. Let our shared policy decide
				// explicit loopback allowances through the proxy as it does for web tools.
				'NO_PROXY=',
				'no_proxy=',
				file,
				...(args ?? []),
			]);
			const sandboxedCommand = await SandboxManager.wrapWithSandbox(
				shellCmd,
				undefined,
				config,
			);

			// env merges over process.env so callers can add a few vars without
			// dropping PATH, HOME, etc.
			const mergedEnv = env ? { ...process.env, ...env } : undefined;

			const child = spawn(sandboxedCommand, {
				shell: true,
				stdio: 'pipe',
				cwd: workingDirectory,
				env: mergedEnv,
				timeout,
			});

			// Collect output
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];
			child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

			// Handle exit and cleanup after child process completes
			const [code, signal] = await once(child, 'close');

			return {
				exit_code: (code as number | null) ?? (signal ? 128 : 1),
				stdout: Buffer.concat(stdout).toString(),
				stderr: Buffer.concat(stderr).toString(),
			};
		} finally {
			try {
				SandboxManager.cleanupAfterCommand();
			} finally {
				await release();
			}
		}
	}
}
