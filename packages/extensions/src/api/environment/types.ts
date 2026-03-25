import type { Filesystem } from '@franklin/lib';

export interface Environment {
	readonly cwd: string;
	readonly fs: Filesystem;
}
