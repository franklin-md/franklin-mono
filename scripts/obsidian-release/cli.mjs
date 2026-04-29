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

	applyRelease(plan);
	runQualityChecks(rootDir);
	commitRelease(rootDir, plan);

	if (!(await confirm(`Create tag ${plan.version}?`))) {
		console.log(
			`Aborted. The bump commit is still in place; tag manually with: git tag -a ${plan.version} -m ${plan.version}`,
		);
		process.exit(0);
	}

	tagRelease(rootDir, plan);

	console.log(`Created Obsidian plugin release tag ${plan.version}`);
	console.log('Push with: git push origin HEAD --follow-tags');
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
