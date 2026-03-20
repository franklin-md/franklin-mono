import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe } from 'vitest';

const DEFAULT_ENV_PATH = resolve(process.cwd(), '.env');

function parseKeyFromDotEnv(
	keyName: string,
	envPath: string,
): string | undefined {
	if (!existsSync(envPath)) {
		return undefined;
	}

	const escapedKeyName = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const keyPattern = new RegExp(
		`^\\s*(?:export\\s+)?${escapedKeyName}\\s*=\\s*(.*)\\s*$`,
	);

	const content = readFileSync(envPath, 'utf-8');
	for (const line of content.split('\n')) {
		if (line.trimStart().startsWith('#')) {
			continue;
		}

		const match = line.match(keyPattern);
		if (!match?.[1]) {
			continue;
		}

		return match[1].trim().replace(/^["']|["']$/g, '');
	}

	return undefined;
}

export function getKeyFromEnv(keyName: string): string | undefined {
	const fromProcessEnv = process.env[keyName];
	if (fromProcessEnv) {
		return fromProcessEnv;
	}

	const fromDotEnv = parseKeyFromDotEnv(keyName, DEFAULT_ENV_PATH);
	if (fromDotEnv) {
		process.env[keyName] = fromDotEnv;
	}

	return fromDotEnv;
}

export function describeIfKey(
	keyName: string,
	name: string,
	fn: () => void,
): void {
	const describeSuite = getKeyFromEnv(keyName) ? describe : describe.skip;
	describeSuite(name, fn);
}
