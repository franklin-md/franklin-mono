import type { EnvironmentConfig } from '@franklin/extensions';
import type { Process } from '@franklin/lib';
import { SandboxedProcess } from './anthropic/sandboxed-process.js';
import { UnrestrictedProcess } from './unrestricted-process.js';
import type { OsInfo } from '@franklin/lib';
import { findRgPath } from './find-rg.js';
import type { AbsolutePath } from '@franklin/lib';

export function createConfigureProcess(osInfo: OsInfo, appDir: AbsolutePath) {
	return {
		configureProcess: async (
			cfg: EnvironmentConfig,
			previous: Process | undefined,
		) => {
			if (previous instanceof SandboxedProcess) {
				await previous.setFilesystemConfig(cfg.fsConfig);
				await previous.setNetworkConfig(cfg.netConfig);
				return previous;
			} else {
				if (previous instanceof UnrestrictedProcess) {
					previous.setCwd(cfg.fsConfig.cwd);
					return previous;
				}
			}

			const os = await osInfo.getPlatform();
			if (os == 'windows') {
				const proc = new UnrestrictedProcess(cfg.fsConfig.cwd);
				return proc;
			}

			// Make sure rg is on PATH if it exists
			// This is necessary further down for
			// SandboxedProcess
			const rgPath = await findRgPath(osInfo);
			if (!rgPath) {
				const proc = new UnrestrictedProcess(cfg.fsConfig.cwd);
				return proc;
			}

			// rg path exists, can proceed with SRT
			if (process.env.PATH) {
				if (
					!process.env.PATH.includes(`:${rgPath}`) &&
					!process.env.PATH.includes(`${rgPath}:`)
				) {
					process.env.PATH += `:${rgPath}`;
				}
			} else {
				process.env.PATH = rgPath as string;
			}

			const proc = new SandboxedProcess(appDir, cfg);
			await proc.initialize();
			return proc;
		},
	};
}
