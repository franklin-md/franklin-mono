import { rename, rm, writeFile } from 'node:fs/promises';

export async function writeAtomic(
	path: string,
	content: string,
): Promise<void> {
	const temporary = `${path}.${crypto.randomUUID()}.tmp`;
	try {
		await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600 });
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true });
	}
}
