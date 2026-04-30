import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { readJson, writeJson } from './json.mjs';
import { assertAllowedUpgrade, assertSemver } from './semver.mjs';
import { updateVersionsJson } from './versions-json.mjs';

export function planRelease({ rootDir, options }) {
	if (!options.version) {
		throw new Error(
			'Usage: npm run release:obsidian -- <x.y.z> [--min-app-version=<x.y.z>] [--dry-run]',
		);
	}

	const manifestPath = resolve(rootDir, 'manifest.json');
	const versionsPath = resolve(rootDir, 'versions.json');

	const manifest = readJson(manifestPath);
	const currentVersion = manifest.version;
	const currentMinAppVersion = manifest.minAppVersion;

	assertSemver(currentVersion, 'current manifest version');
	assertAllowedUpgrade(currentVersion, options.version);

	if (typeof currentMinAppVersion !== 'string') {
		throw new Error('manifest.json must include minAppVersion');
	}

	if (options.minAppVersion !== undefined) {
		assertSemver(options.minAppVersion, 'minAppVersion');
	}

	const nextMinAppVersion = options.minAppVersion ?? currentMinAppVersion;
	const shouldUpdateVersions =
		existsSync(versionsPath) || nextMinAppVersion !== currentMinAppVersion;

	const changedFiles = ['manifest.json'];
	if (shouldUpdateVersions) changedFiles.push('versions.json');

	return {
		version: options.version,
		currentVersion,
		nextMinAppVersion,
		manifest,
		manifestPath,
		versionsPath,
		shouldUpdateVersions,
		changedFiles,
	};
}

export function applyRelease(plan) {
	plan.manifest.version = plan.version;
	plan.manifest.minAppVersion = plan.nextMinAppVersion;
	writeJson(plan.manifestPath, plan.manifest);

	if (plan.shouldUpdateVersions) {
		updateVersionsJson(plan.versionsPath, {
			minAppVersion: plan.nextMinAppVersion,
			version: plan.version,
		});
	}
}

export function formatPlan(plan) {
	return [
		`Prepared Obsidian plugin release ${plan.currentVersion} -> ${plan.version}`,
		`minAppVersion: ${plan.nextMinAppVersion}`,
		`Changed files: ${plan.changedFiles.join(', ')}`,
	].join('\n');
}
