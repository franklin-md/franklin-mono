import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
