import {
	SandboxManager,
	type SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import type { NetworkPermissions } from '@franklin/lib';
import { createSandboxNetworkPolicy } from './network.js';

type Release = () => Promise<void>;
type Request = {
	key: string;
	config: SandboxRuntimeConfig;
	permissions: NetworkPermissions;
	resolve: (release: Release) => void;
	reject: (error: unknown) => void;
};
type Active = { key: string; users: number };

let active: Active | undefined;
let transitioning = false;
const pending: Request[] = [];

export function acquireSandboxRuntime(
	config: SandboxRuntimeConfig,
	permissions: NetworkPermissions,
): Promise<Release> {
	return new Promise((resolve, reject) => {
		pending.push({
			key: JSON.stringify({ config, permissions }),
			config,
			permissions,
			resolve,
			reject,
		});
		pump();
	});
}

function pump(): void {
	if (transitioning) return;
	const next = pending[0];
	if (!next) return;
	if (active) {
		// Do not let later matching requests jump ahead of a queued policy change.
		while (pending[0]?.key === active.key) {
			const request = pending.shift();
			if (request) grant(request, active);
		}
		return;
	}
	pending.shift();
	transitioning = true;
	void initialize(next);
}

async function initialize(request: Request): Promise<void> {
	try {
		// Franklin permits public hosts with an empty allowlist; SRT denies them.
		// Empty native lists route all proxy decisions through our existing policy.
		// See https://github.com/anthropic-experimental/sandbox-runtime#programmatic-usage
		await SandboxManager.initialize(
			request.config,
			createSandboxNetworkPolicy(request.permissions),
		);
		active = { key: request.key, users: 0 };
		grant(request, active);
	} catch (error) {
		try {
			await SandboxManager.reset();
		} catch (cleanupError) {
			request.reject(
				new AggregateError(
					[error, cleanupError],
					'Sandbox initialization and cleanup failed',
				),
			);
			return;
		}
		request.reject(error);
	} finally {
		transitioning = false;
		pump();
	}
}

function grant(request: Request, runtime: Active): void {
	runtime.users++;
	let released = false;
	request.resolve(async () => {
		if (released) return;
		released = true;
		runtime.users--;
		if (runtime.users > 0) return;
		// SandboxManager's proxies and configuration are process-global. Reset only
		// after every command has closed; another policy can then acquire the runtime.
		transitioning = true;
		try {
			await SandboxManager.reset();
		} finally {
			active = undefined;
			transitioning = false;
			pump();
		}
	});
}
