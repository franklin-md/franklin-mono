import type { FilesystemConfig } from '@franklin/extensions';

const PROTECTED_FILES = [
	'.bashrc',
	'.bash_profile',
	'.zshrc',
	'.zprofile',
	'.profile',
	'.gitconfig',
	'.gitmodules',
	'.ripgreprc',
	'.mcp.json',
];

const PROTECTED_DIRECTORIES = [
	'.vscode',
	'.idea',
	'.claude/commands',
	'.claude/agents',
	'.git/hooks',
];

const PROTECTED_EXACT_FILES = ['.git/config'];

function fileGlob(file: string) {
	return `**/${file}`;
}

function directoryGlobs(directory: string) {
	return [`**/${directory}`, `**/${directory}/**`];
}

// Certain sensitive files and directories are always blocked from writes,
// even if they fall within an allowed write path. This provides defense-in-depth
// against sandbox escapes and configuration tampering.
// See: https://github.com/anthropic-experimental/sandbox-runtime?tab=readme-ov-file#mandatory-deny-paths-auto-protected-files
// It mimics the behaviour of the Anthropic Sandbox.
export const ANTHROPIC_PROTECTED = [
	...PROTECTED_FILES.map(fileGlob),
	...PROTECTED_DIRECTORIES.flatMap(directoryGlobs),
	...PROTECTED_EXACT_FILES.map(fileGlob),
];

export function withAnthropicProtected(
	fsConfig: FilesystemConfig,
): FilesystemConfig {
	return {
		cwd: fsConfig.cwd,
		permissions: {
			denyRead: fsConfig.permissions.denyRead,
			allowRead: fsConfig.permissions.allowRead,
			allowWrite: fsConfig.permissions.allowWrite,
			denyWrite: [...fsConfig.permissions.denyWrite, ...ANTHROPIC_PROTECTED],
		},
	};
}
