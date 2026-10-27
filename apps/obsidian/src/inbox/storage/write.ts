import { rename, rm, writeFile } from 'node:fs/promises';

export async function writeAtomic(
	path: string,
	content: string,
): Promise<void> {
	const temp = `${path}.${crypto.randomUUID()}.tmp`;
	try {
		await writeFile(temp, content, { encoding: 'utf8', mode: 0o600 });
		await rename(temp, path);
	} finally {
		await rm(temp, { force: true });
	}
}
