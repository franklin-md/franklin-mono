import type { Filesystem } from '@franklin/lib';

export interface Environment {
	readonly filesystem: Filesystem;
}
