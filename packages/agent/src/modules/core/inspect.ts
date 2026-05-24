import type { CoreInspectDump } from './inspect-dump.js';
import type { CoreRuntime } from './runtime/index.js';

/**
 * Compatibility wrapper for runtime inspection. Redaction lives on the runtime
 * because it owns the live Mini-ACP context projection used for inspect.
 */
export async function inspectRuntime(
	runtime: CoreRuntime,
): Promise<CoreInspectDump> {
	return runtime.inspect();
}
