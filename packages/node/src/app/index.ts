import type { FranklinExtension } from '@franklin/agent';
import { FranklinApp } from '@franklin/agent/browser';
import { SessionManager } from 'packages/agent/src/browser.js';
import { spawn } from './spawn.js';

export class App extends FranklinApp {
	public readonly agents: SessionManager;

	constructor(extensions: FranklinExtension[]) {
		super(extensions);
		// Setup the sessionManager
		this.agents = new SessionManager(spawn, extensions);
	}
}
