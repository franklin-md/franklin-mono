import type { Process } from '@franklin/lib';

export type GrepBackend =
	| { kind: 'ripgrep'; command: string }
	| { kind: 'grep'; command: string }
	| { kind: 'none' };

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
): Promise<GrepBackend> {
	if (await tryVersion(process, 'rg')) {
		return { kind: 'ripgrep', command: 'rg' };
	}
	if (await tryVersion(process, 'grep')) {
		return { kind: 'grep', command: 'grep' };
	}
	return { kind: 'none' };
}
