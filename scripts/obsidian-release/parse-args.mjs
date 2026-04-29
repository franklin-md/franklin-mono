export function parseArgs(args) {
	const options = {
		dryRun: false,
		minAppVersion: undefined,
		version: undefined,
	};

	for (const arg of args) {
		if (arg === '--dry-run') {
			options.dryRun = true;
			continue;
		}

		if (arg.startsWith('--min-app-version=')) {
			options.minAppVersion = arg.slice('--min-app-version='.length);
			continue;
		}

		if (arg.startsWith('-')) {
			throw new Error(`Unknown option: ${arg}`);
		}

		if (options.version !== undefined) {
			throw new Error(`Unexpected extra argument: ${arg}`);
		}

		options.version = arg;
	}

	return options;
}
