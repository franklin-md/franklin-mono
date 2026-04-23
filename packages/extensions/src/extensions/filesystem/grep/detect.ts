import type { Process } from '@franklin/lib';
import type { GrepBackendKind } from './backends/types.js';

const DETECT_TIMEOUT_MS = 2000;

async function tryVersion(process: Process, command: string): Promise<boolean> {
	try {
		const { exit_code } = await process.exec({
			file: command,
			args: ['--version'],
			timeout: DETECT_TIMEOUT_MS,
		});
		return exit_code === 0;
	} catch {
		return false;
	}
}

export async function detectGrepBackend(
	process: Process,
): Promise<GrepBackendKind> {
	if (await tryVersion(process, 'rg')) {
		return 'ripgrep';
	}
	if (await tryVersion(process, 'grep')) {
		return 'grep';
	}
	return 'none';
}
