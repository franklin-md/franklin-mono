import type { ClientProtocol } from '@franklin/mini-acp';
import type { Framework } from '@franklin/agent';
import { App } from './app/index.js';
import { spawn } from './app/spawn.js';
import type { FranklinApp } from 'packages/agent/src/app.js';
import type { FranklinExtension } from 'packages/agent/src/app.js';

// ---------------------------------------------------------------------------
// NodeFramework
// ---------------------------------------------------------------------------

export class NodeFramework implements Framework {
	createApp(extensions: FranklinExtension[]): FranklinApp {
		return new App(extensions);
	}

	spawn(): ClientProtocol {
		return spawn();
	}
}
