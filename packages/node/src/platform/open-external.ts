import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// TODO: Move this under a shared `os` namespace with filesystem and similar host APIs.
export async function openExternal(url: string): Promise<void> {
	if (process.platform === 'darwin') {
		await execFileAsync('open', [url]);
		return;
	}
	if (process.platform === 'win32') {
		await execFileAsync('cmd', ['/c', 'start', '', url]);
		return;
	}
	await execFileAsync('xdg-open', [url]);
}
