import type {
	AuthenticateRequest,
	AuthenticateResponse,
	CancelNotification,
	InitializeRequest,
	InitializeResponse,
	ListSessionsRequest,
	ListSessionsResponse,
	LoadSessionRequest,
	LoadSessionResponse,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
	SetSessionConfigOptionRequest,
	SetSessionConfigOptionResponse,
	SetSessionModeRequest,
	SetSessionModeResponse,
} from '@agentclientprotocol/sdk';
import { ClientSideConnection, RequestError } from '@agentclientprotocol/sdk';

import type { AgentControl, AgentEvents } from './stack/types.js';
import type { Transport } from './transport/index.js';

export class AgentConnection implements AgentControl {
	private readonly conn: ClientSideConnection;
	private readonly transport: Transport;
	handler: Partial<AgentEvents>;

	constructor(transport: Transport, handler?: Partial<AgentEvents>) {
		this.transport = transport;
		this.handler = handler ?? {};

		// Late-binding closure: reads this.handler at call time, not construction time.
		// This enables connect() to swap the handler after the connection is built.
		/* eslint-disable @typescript-eslint/no-unsafe-argument */
		this.conn = new ClientSideConnection(
			() => ({
				sessionUpdate: (p) => {
					if (!this.handler.sessionUpdate)
						throw RequestError.methodNotFound('session/update');
					return this.handler.sessionUpdate(p);
				},
				requestPermission: (p) => {
					if (!this.handler.requestPermission)
						throw RequestError.methodNotFound('permission/request');
					return this.handler.requestPermission(p);
				},
				writeTextFile: (p) => {
					if (!this.handler.writeTextFile)
						throw RequestError.methodNotFound('fs/write_text_file');
					return this.handler.writeTextFile(p);
				},
				readTextFile: (p) => {
					if (!this.handler.readTextFile)
						throw RequestError.methodNotFound('fs/read_text_file');
					return this.handler.readTextFile(p);
				},
				createTerminal: (p) => {
					if (!this.handler.createTerminal)
						throw RequestError.methodNotFound('terminal/create');
					return this.handler.createTerminal(p);
				},
				terminalOutput: (p) => {
					if (!this.handler.terminalOutput)
						throw RequestError.methodNotFound('terminal/output');
					return this.handler.terminalOutput(p);
				},
				releaseTerminal: (p) => {
					if (!this.handler.releaseTerminal)
						throw RequestError.methodNotFound('terminal/release');
					return this.handler.releaseTerminal(p);
				},
				waitForTerminalExit: (p) => {
					if (!this.handler.waitForTerminalExit)
						throw RequestError.methodNotFound('terminal/wait_for_exit');
					return this.handler.waitForTerminalExit(p);
				},
				killTerminal: (p) => {
					if (!this.handler.killTerminal)
						throw RequestError.methodNotFound('terminal/kill');
					return this.handler.killTerminal(p);
				},
				extMethod: (method, _p) => {
					throw RequestError.methodNotFound(method);
				},
				extNotification: (_method, _p) => {
					return Promise.resolve();
				},
			}),
			transport.stream,
		);
		/* eslint-enable @typescript-eslint/no-unsafe-argument */
	}

	// --- Agent methods (outbound) ---

	initialize(params: InitializeRequest): Promise<InitializeResponse> {
		return this.conn.initialize(params);
	}

	newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
		return this.conn.newSession(params);
	}

	loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
		return this.conn.loadSession(params);
	}

	listSessions(params: ListSessionsRequest): Promise<ListSessionsResponse> {
		return this.conn.listSessions(params);
	}

	prompt(params: PromptRequest): Promise<PromptResponse> {
		return this.conn.prompt(params);
	}

	cancel(params: CancelNotification): Promise<void> {
		return this.conn.cancel(params);
	}

	setSessionMode(
		params: SetSessionModeRequest,
	): Promise<SetSessionModeResponse> {
		return this.conn.setSessionMode(params);
	}

	setSessionConfigOption(
		params: SetSessionConfigOptionRequest,
	): Promise<SetSessionConfigOptionResponse> {
		return this.conn.setSessionConfigOption(params);
	}

	authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse> {
		return this.conn.authenticate(params);
	}

	extMethod(
		method: string,
		params: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		return this.conn.extMethod(method, params);
	}

	extNotification(
		method: string,
		params: Record<string, unknown>,
	): Promise<void> {
		return this.conn.extNotification(method, params);
	}

	// --- Lifecycle ---

	get signal(): AbortSignal {
		return this.conn.signal;
	}

	get closed(): Promise<void> {
		return this.conn.closed;
	}

	async dispose(): Promise<void> {
		await this.transport.dispose();
	}
}
