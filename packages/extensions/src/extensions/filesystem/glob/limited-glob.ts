import type { Filesystem } from '@franklin/lib';

type GlobOptions = Parameters<Filesystem['glob']>[1];

export interface LimitedGlobResult {
	files: string[];
	exceededLimit: boolean;
}

export async function limitedGlob(
	filesystem: Filesystem,
	pattern: string | string[],
	options: GlobOptions,
): Promise<LimitedGlobResult> {
	const { limit, ...globOptions } = options;
	if (limit === undefined || limit === 0) {
		// Keep limit: 0 as the legacy no-limit sentinel.
		return {
			files: await filesystem.glob(pattern, globOptions),
			exceededLimit: false,
		};
	}

	// Probe one extra result so "exactly at limit" is not reported as limited.
	const probedFiles = await filesystem.glob(pattern, {
		...globOptions,
		limit: limit + 1,
	});
	const exceededLimit = probedFiles.length > limit;

	return {
		files: exceededLimit ? probedFiles.slice(0, limit) : probedFiles,
		exceededLimit,
	};
}
