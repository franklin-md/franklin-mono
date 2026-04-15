import { parseBuildArgs } from './cli.mjs';
import { createCssBuilder } from './css/build.mjs';
import { createJsBuilder } from './js/build.mjs';
import { sync } from './sync.mjs';

const args = parseBuildArgs();
const js = createJsBuilder(args);
const css = createCssBuilder(args);
const runSync = () => sync(args);

await Promise.all([js.build(), css.build()]);
runSync();

// ── Single build ────────────────────────────────────────────
if (!args.isWatch) {
	process.exit(0);
}

// ── Watch mode ──────────────────────────────────────────────
console.log('Starting watch mode…');

await js.watch(runSync, { skipInitialOnEnd: true });
css.watch(runSync);

console.log('Watching for changes…');
