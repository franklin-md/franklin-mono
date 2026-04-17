import type { AbsolutePath, Filesystem } from '@franklin/lib';

// ---------------------------------------------------------------------------
// Instruction files
//
// Data types for the auto-loaded user system prompt mechanism
// (AGENTS.md / CLAUDE.md / .cursorrules / etc.). See
// `packages/agent/DESIGN.md` §"Auto-Loaded User System Prompts"
// for the conceptual model and the collect/resolve split.
// ---------------------------------------------------------------------------

export type InstructionScope = 'global' | 'project' | 'directory';

export interface InstructionFile {
	readonly path: AbsolutePath;
	readonly content: string;
	/** The spec that produced this file (e.g. `"agents.md"`, `"claude.md"`). */
	readonly spec: string;
	readonly scope: InstructionScope;
	/** Distance from `cwd` when discovered: 0 = cwd, 1 = parent, ... */
	readonly depth: number;
}

export interface InstructionSpec {
	readonly name: string;
	collect(fs: Filesystem, cwd: AbsolutePath): Promise<InstructionFile[]>;
}

export interface InstructionsManager {
	readonly specs: readonly InstructionSpec[];
	resolve(files: InstructionFile[]): string;
}
