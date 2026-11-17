import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { requiresSwitch } from '../requires-switch.js';
import type { RequestQueue } from './queue.js';
import type { Admission } from './types.js';

export function selectAdmission(
	queue: RequestQueue,
	config: SandboxRuntimeConfig | undefined,
): Admission {
	// TODO(franklin-c58): revisit bounded admission windows if measurements justify
	// bypassing. For now, the oldest incompatible request closes admission.
	const next_request = queue.peek();
	return {
		next_request,
		requires_switch: requiresSwitch(config, next_request?.config),
	};
}
