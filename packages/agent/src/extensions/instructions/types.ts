import type { AbsolutePath, Filesystem } from '@franklin/lib';

// ---------------------------------------------------------------------------
// Instruction files
//
// Data types for the auto-loaded user system prompt mechanism
// (AGENTS.md / CLAUDE.md / .cursorrules / etc.). See
// `packages/agent/DESIGN.md` §"Auto-Loaded User System Prompts"
// for the conceptual model and the collect/resolve split.
// ---------------------------------------------------------------------------

export interface InstructionSpec {
	readonly name: string;
	collect(fs: Filesystem, cwd: AbsolutePath): Promise<AbsolutePath[]>;
}

export interface InstructionsManager {
	readonly specs: readonly InstructionSpec[];
	resolve(files: AbsolutePath[]): string;
}
