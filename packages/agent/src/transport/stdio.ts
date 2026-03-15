import type { AnyMessage } from '@agentclientprotocol/sdk';
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
	readonly readable: ReadableStream<AnyMessage>;
	readonly writable: WritableStream<AnyMessage>;
	private readonly stdioPipe: StdioPipe;

	constructor(options: StdioTransportOptions) {
		this.stdioPipe = new StdioPipe(options);
		const stream = ndJsonStream(
			this.stdioPipe.writable,
			this.stdioPipe.readable,
		);
		this.readable = stream.readable;
		this.writable = stream.writable;
	}

	async close(): Promise<void> {
		await this.stdioPipe.close();
	}
}
