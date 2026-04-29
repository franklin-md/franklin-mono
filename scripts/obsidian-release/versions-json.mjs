import { existsSync } from 'node:fs';

import { readJson, writeJson } from './json.mjs';
import { compareVersions } from './semver.mjs';

export function updateVersionsJson(path, { version, minAppVersion }) {
	const versions = existsSync(path) ? readJson(path) : {};
	versions[version] = minAppVersion;
	writeJson(path, sortVersionEntries(versions));
}

function sortVersionEntries(versions) {
	return Object.fromEntries(
		Object.entries(versions).sort(([left], [right]) =>
			compareVersions(left, right),
		),
	);
}
