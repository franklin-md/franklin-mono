import type { FilesystemConfig } from '@franklin/extensions';

// Certain sensitive files and directories are always blocked from writes,
// even if they fall within an allowed write path. This provides defense-in-depth
// against sandbox escapes and configuration tampering.
// See: https://github.com/anthropic-experimental/sandbox-runtime?tab=readme-ov-file#mandatory-deny-paths-auto-protected-files
// It mimics the behaviour of the Anthropic Sandbox.
export const ANTHROPIC_PROTECTED = [
	'.bashrc',
	'.bash_profile',
	'.zshrc',
	'.zprofile',
	'.profile',
	'.gitconfig',
	'.gitmodules',
	'.ripgreprc',
	'.mcp.json',
	'.vscode/',
	'.idea/',
	'.claude/commands/',
	'.claude/agents/',
	'.git/hooks/',
	'.git/config',
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
