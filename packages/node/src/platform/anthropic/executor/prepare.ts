import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { quote as quoteArgv } from 'shell-quote';
import type { ProcessInput } from '@franklin/lib';

export async function prepare(
	input: ProcessInput,
	config: SandboxRuntimeConfig,
): Promise<string> {
	const { file, args } = input;
	const tempDirectory = tmpdir();
	await access(tempDirectory, constants.W_OK);
	// SandboxManager.wrapWithSandbox takes a shell-string and returns a
	// shell-string (e.g. `sandbox-exec -p <policy> /bin/sh -c "..."`), which
	// must ultimately be run through `shell: true`. We POSIX-quote the argv
	// here so the shell reassembles the exact argv we were given — callers
	// never have to shell-escape themselves.
	// SRT overrides the outer TMPDIR with /tmp/claude, which may not exist.
	// Rebind the existing OS temp directory inside the sandbox; its configured
	// filesystem policy still decides whether the command may write there.
	const shellCmd = quoteArgv([
		'env',
		`TMPDIR=${tempDirectory}`,
		file,
		...(args ?? []),
	]);
	return SandboxManager.wrapWithSandbox(shellCmd, undefined, config);
}
