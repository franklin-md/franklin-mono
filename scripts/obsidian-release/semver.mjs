const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function assertSemver(version, label) {
	if (!VERSION_PATTERN.test(version)) {
		throw new Error(`Obsidian ${label} must use x.y.z format: ${version}`);
	}
}

export function compareVersions(left, right) {
	const leftParts = left.split('.').map(Number);
	const rightParts = right.split('.').map(Number);

	for (let index = 0; index < leftParts.length; index += 1) {
		const diff = leftParts[index] - rightParts[index];
		if (diff !== 0) return diff;
	}

	return 0;
}

export function assertAllowedUpgrade(currentVersion, targetVersion) {
	assertSemver(targetVersion, 'plugin version');

	if (compareVersions(targetVersion, currentVersion) <= 0) {
		throw new Error(
			`Target version ${targetVersion} must be greater than current manifest version ${currentVersion}.`,
		);
	}
}
