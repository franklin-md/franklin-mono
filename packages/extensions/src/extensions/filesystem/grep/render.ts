import type { GrepBackend } from './detect.js';

// Authors the system-prompt section for the grep tool. The critical job of
// this fragment is telling the model which regex dialect to emit: `rg`
// (Rust regex) and POSIX `grep -E` differ enough that the same pattern can
// silently behave differently (\d, lookaround, named groups). The tool
// handler dispatches to whichever backend is available, but the model must
// know the safe syntax subset upfront or it will write patterns that match
// in one backend and fail in the other.
export function renderGrepInfo(backend: GrepBackend): string {
	switch (backend.kind) {
		case 'ripgrep':
			return [
				'Grep tool backend: ripgrep (`rg`).',
				'Regex dialect: Rust regex (PCRE-lite). \\d, \\w, \\s, (?:...), anchors, character classes are supported. Lookaround is not supported.',
				'Ripgrep respects .gitignore by default.',
			].join('\n');
		case 'grep':
			return [
				'Grep tool backend: POSIX grep (-E, ERE).',
				'Regex dialect: Extended Regular Expressions. \\d is NOT supported — use [0-9] instead.',
				'Safe subset: character classes, alternation, anchors, grouping. Avoid lookaround and named groups.',
			].join('\n');
		case 'none':
			return 'Grep tool: unavailable (no `rg` or `grep` in PATH). Use `glob` + `read_file` to search file contents.';
	}
}
