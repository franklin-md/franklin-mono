#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';

import { AgentManager, type AdapterFactory } from '@franklin/agent-manager';
import { CodexAdapter } from '@franklin/managed-agent';
import { MockAdapter, MockedAgent } from '@franklin/managed-agent/testing';

import { App } from './app.js';
import { alternateScreen, applyMode } from './lib/terminal-modes.js';

const isMock = process.argv.includes('--mock');

const adapterFactory: AdapterFactory = (kind, options) => {
	if (kind === 'mock' || isMock) {
		return new MockAdapter(options, new MockedAgent(options.agentId));
	}
	if (kind === 'codex') {
		return new CodexAdapter({ onEvent: options.onEvent });
	}
	throw new Error(`Unknown adapter kind: "${kind}"`);
};

const manager = new AgentManager({ adapterFactory });

const disableAltScreen = applyMode(alternateScreen(), process.stdout);
const instance = render(<App manager={manager} />);

function cleanup() {
	instance.unmount();
	disableAltScreen();
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
