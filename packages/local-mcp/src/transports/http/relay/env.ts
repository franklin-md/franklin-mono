import type { EnvVariable } from '@agentclientprotocol/sdk';

import {
	FRANKLIN_CALLBACK_URL_KEY,
	FRANKLIN_NAME_KEY,
	FRANKLIN_TOOLS_KEY,
} from './tags.js';

export interface RelayToolDef {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface RelayEnv {
	name: string;
	callbackUrl: string;
	tools: RelayToolDef[];
}

/**
 * Builds the env array for McpServerConfig from typed RelayEnv.
 */
export function serializeRelayEnv(env: RelayEnv): EnvVariable[] {
	return [
		{ name: FRANKLIN_NAME_KEY, value: env.name },
		{ name: FRANKLIN_CALLBACK_URL_KEY, value: env.callbackUrl },
		{ name: FRANKLIN_TOOLS_KEY, value: JSON.stringify(env.tools) },
	];
}

/**
 * Reads and validates relay env from process.env. Throws with a clear message on failure.
 */
export function parseRelayEnv(processEnv: NodeJS.ProcessEnv): RelayEnv {
	const parseKey = (key: string) => {
		const value = processEnv[key];
		if (!value) {
			process.stderr.write(`${key} is required\n`);
			process.exit(1);
		}
		return value;
	};
	const callbackUrl = parseKey(FRANKLIN_CALLBACK_URL_KEY);
	const name = parseKey(FRANKLIN_NAME_KEY);
	const toolsJson = parseKey(FRANKLIN_TOOLS_KEY);

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

	return { name, callbackUrl, tools };
}
