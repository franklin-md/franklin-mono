import type { AbsolutePath } from '@franklin/lib';

import type { InstructionSpec } from '../types.js';
import { walkUp } from '../discovery/walk-up.js';
import { probe } from '../discovery/probe.js';

// Paths probed relative to each directory visited during the upward walk.
// Order mirrors Claude Code's concatenation rule ("CLAUDE.local.md below
// CLAUDE.md"), followed by `.claude/CLAUDE.md`. The `.claude/CLAUDE.md`
// probe also picks up `~/.claude/CLAUDE.md` for free when the walk passes
// through the user's home directory.
const PROBES = ['CLAUDE.md', 'CLAUDE.local.md', '.claude/CLAUDE.md'] as const;

export interface ClaudeSpecArgs {
	/** Upward boundary for the walk (inclusive). Defaults to the filesystem root. */
	readonly endDir?: AbsolutePath;
}

export function createClaudeSpec(args: ClaudeSpecArgs = {}): InstructionSpec {
	// TODO: not yet supported:
	// - Sub-directory CLAUDE.md (loaded lazily when a file under the subtree
	//   is read). Does not fit the eager collect() signature; needs FS-read
	//   hooks.
	// - CLAUDE/rules/*.md with YAML frontmatter conditional activation —
	//   separate walker + frontmatter parser.
	// - `@path` expansion (recursive file inclusion from referenced paths).
	// - HTML block-comment stripping (`<!-- ... -->` as maintainer notes).
	// - cwd outside home: `~/.claude/CLAUDE.md` is only picked up because
	//   walk-up passes through home. If cwd does not descend from home, the
	//   global layer is missed. Re-introduce an explicit `home` arg if this
	//   matters.
	return {
		name: 'claude.md',
		async collect(fs, cwd) {
			return walkUp<AbsolutePath>({
				startDir: cwd,
				endDir: args.endDir,
				discover: (dir) => probe(fs, dir, PROBES),
			});
		},
	};
}
