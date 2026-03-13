#!/usr/bin/env node
import { render } from 'ink';

import { createDefaultRegistry } from '@franklin/agent';

import { App } from './app.js';
import { TuiAgentManager } from './lib/tui-agent-manager.js';
import { alternateScreen, applyMode } from './lib/terminal-modes.js';

const registry = createDefaultRegistry();
const manager = new TuiAgentManager(registry);

const disableAltScreen = applyMode(alternateScreen(), process.stdout);
const instance = render(<App manager={manager} />);

function cleanup() {
	instance.unmount();
	disableAltScreen();
	void manager.disposeAll();
}
process.on('exit', cleanup);
process.on('SIGINT', () => {
	cleanup();
	process.exit(0);
});
process.on('SIGTERM', () => {
	cleanup();
	process.exit(0);
});
