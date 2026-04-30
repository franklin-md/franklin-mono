import { execFileSync } from 'node:child_process';

export function runQualityChecks(rootDir) {
	runCommand(rootDir, 'npm', ['run', 'check']);
	runCommand(rootDir, 'npm', ['run', 'test']);
}

function runCommand(rootDir, command, args) {
	execFileSync(command, args, {
		cwd: rootDir,
		env: {
			...process.env,
			NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=4096',
		},
		stdio: 'inherit',
	});
}
