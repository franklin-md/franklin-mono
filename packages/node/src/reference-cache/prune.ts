import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function pruneCache(
	directory: string,
	maxBytes: number,
): Promise<void> {
	const names = await readdir(directory).catch((error: unknown) => {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
			return [];
		throw error;
	});
	const entries = await Promise.all(
		names
			.filter((name) => /^[a-f0-9]{64}\.cache$/.test(name))
			.map(async (name) => {
				const path = join(directory, name);
				const info = await stat(path);
				return { path, size: info.size, accessed: info.mtimeMs };
			}),
	);
	let total = entries.reduce((sum, entry) => sum + entry.size, 0);
	for (const entry of entries.sort((a, b) => a.accessed - b.accessed)) {
		if (maxBytes > 0 && total <= maxBytes) break;
		await rm(entry.path, { force: true });
		total -= entry.size;
	}
}
