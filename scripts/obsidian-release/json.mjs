import { readFileSync, writeFileSync } from 'node:fs';

export function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`);
}
