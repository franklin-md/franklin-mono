#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';

import { AgentManager } from '@franklin/agent-manager';
import type {
	AdapterOptions,
	ManagedAgentAdapter,
} from '@franklin/managed-agent';

import { App } from './app.js';
import { MockAdapter } from './lib/mock-adapter.js';

const isMock = process.argv.includes('--mock');

const adapterFactory = (
	kind: string,
	options: AdapterOptions,
): ManagedAgentAdapter => {
	if (kind === 'mock' || isMock) {
		return new MockAdapter(options);
	}
	throw new Error(`Unknown adapter kind: "${kind}"`);
};

const manager = new AgentManager({ adapterFactory });

render(<App manager={manager} />);
