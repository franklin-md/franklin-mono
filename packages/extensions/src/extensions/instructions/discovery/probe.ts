import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';

export async function probe(
	fs: Filesystem,
	path: AbsolutePath,
	probes: readonly string[],
): Promise<AbsolutePath[]> {
	const results: AbsolutePath[] = [];
	for (const probe of probes) {
		const probedPath = joinAbsolute(path, probe);
		if (!(await fs.exists(probedPath))) continue;
		results.push(probedPath);
	}
	return results;
}
