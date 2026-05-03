#!/usr/bin/env node
import { resolve } from 'node:path';

import {
	assertCleanWorktree,
	assertTagDoesNotExist,
	commitRelease,
	tagRelease,
} from './git.mjs';
import { runQualityChecks } from './npm-checks.mjs';
import { parseArgs } from './parse-args.mjs';
import { applyRelease, formatPlan, planRelease } from './plan.mjs';
import { confirm } from './prompt.mjs';

const rootDir = resolve(import.meta.dirname, '../..');

try {
	const options = parseArgs(process.argv.slice(2));
	const plan = planRelease({ rootDir, options });

	if (options.dryRun) {
		console.log(formatPlan(plan));
		process.exit(0);
	}

	assertCleanWorktree(rootDir);
	assertTagDoesNotExist(rootDir, plan.version);

	runQualityChecks(rootDir);

	if (
		!(await confirm(`Commit and tag Obsidian plugin release ${plan.version}?`))
	) {
		console.log('Aborted. No commit or tag was created.');
		process.exit(0);
	}

	applyRelease(plan);
	commitRelease(rootDir, plan);
	tagRelease(rootDir, plan);

	console.log(`Created Obsidian plugin release tag ${plan.version}`);
	console.log('Push with: git push origin HEAD --follow-tags');
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
