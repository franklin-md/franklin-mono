import type { Filesystem as CoreFilesystem } from '@franklin/lib';

export type { Filesystem } from '@franklin/lib';

export interface Terminal {
	exec(
		command: string,
		cwd: string,
		options: {
			onData: (data: Buffer) => void;
			signal?: AbortSignal;
			timeout?: number;
			env?: NodeJS.ProcessEnv;
		},
	): Promise<{ exitCode: number | null }>;
}

export interface Sandbox {
	readonly cwd: string;
	readonly fs: CoreFilesystem;
	readonly terminal: Terminal;
}
