import { FRANKLIN_CALLBACK_URL_KEY, FRANKLIN_TOOLS_KEY } from './tags.js';

export interface RelayToolDef {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface RelayEnv {
	callbackUrl: string;
	tools: RelayToolDef[];
}

export type RelayEnvEntry = { name: string; value: string };

/**
 * Builds the env array for McpServerConfig from typed RelayEnv.
 */
export function serializeRelayEnv(env: RelayEnv): RelayEnvEntry[] {
	return [
		{ name: FRANKLIN_CALLBACK_URL_KEY, value: env.callbackUrl },
		{ name: FRANKLIN_TOOLS_KEY, value: JSON.stringify(env.tools) },
	];
}

/**
 * Reads and validates relay env from process.env. Throws with a clear message on failure.
 */
export function parseRelayEnv(processEnv: NodeJS.ProcessEnv): RelayEnv {
	const callbackUrl = processEnv[FRANKLIN_CALLBACK_URL_KEY];
	if (!callbackUrl) {
		process.stderr.write(`${FRANKLIN_CALLBACK_URL_KEY} is required\n`);
		process.exit(1);
	}

	const toolsJson = processEnv[FRANKLIN_TOOLS_KEY];
	if (!toolsJson) {
		process.stderr.write(`${FRANKLIN_TOOLS_KEY} is required\n`);
		process.exit(1);
	}

	let tools: RelayToolDef[];
	try {
		tools = JSON.parse(toolsJson) as RelayToolDef[];
	} catch {
		process.stderr.write(`${FRANKLIN_TOOLS_KEY} must be valid JSON\n`);
		process.exit(1);
	}

	if (!Array.isArray(tools)) {
		process.stderr.write(`${FRANKLIN_TOOLS_KEY} must be an array\n`);
		process.exit(1);
	}

	return { callbackUrl, tools };
}
