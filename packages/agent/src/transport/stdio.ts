import type { Stream } from '@agentclientprotocol/sdk';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import { StdioPipe } from '@franklin/transport';

import type { AgentTransport } from './index.js';

export interface StdioTransportOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
}

export class StdioTransport implements AgentTransport {
	readonly stream: Stream;
	private readonly stdioPipe: StdioPipe;

	constructor(options: StdioTransportOptions) {
		this.stdioPipe = new StdioPipe(options);
		this.stream = ndJsonStream(
			this.stdioPipe.pipe.writable,
			this.stdioPipe.pipe.readable,
		);
	}

	async dispose(): Promise<void> {
		await this.stdioPipe.dispose();
	}
}
