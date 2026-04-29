import { execFileSync } from 'node:child_process';

export function assertCleanWorktree(rootDir) {
	const status = execFileSync('git', ['status', '--porcelain'], {
		cwd: rootDir,
		encoding: 'utf8',
	});

	if (status.length > 0) {
		throw new Error('Obsidian release requires a clean git worktree.');
	}
}

export function assertTagDoesNotExist(rootDir, tag) {
	try {
		execFileSync(
			'git',
			['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`],
			{
				cwd: rootDir,
				stdio: 'ignore',
			},
		);
		throw new Error(`Git tag already exists: ${tag}`);
	} catch (error) {
		if (isCommandExit(error, 1)) return;
		throw error;
	}
}

export function commitRelease(rootDir, plan) {
	runGit(rootDir, ['add', ...plan.changedFiles]);
	runGit(rootDir, ['commit', '-m', `Bump Obsidian plugin to ${plan.version}`]);
	assertCleanWorktree(rootDir);
}

export function tagRelease(rootDir, plan) {
	runGit(rootDir, ['tag', '-a', plan.version, '-m', plan.version]);
}

function runGit(rootDir, args) {
	execFileSync('git', args, {
		cwd: rootDir,
		stdio: 'inherit',
	});
}

function isCommandExit(error, status) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		error.status === status
	);
}
