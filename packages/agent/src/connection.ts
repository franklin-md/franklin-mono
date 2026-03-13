import type {
	AuthenticateRequest,
	AuthenticateResponse,
	CancelNotification,
	Client,
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

import type { Transport } from './transport/index.js';

export class AgentConnection {
	private readonly conn: ClientSideConnection;
	private readonly transport: Transport;
	handler: Client;

	constructor(transport: Transport, handler?: Client) {
		this.transport = transport;
		this.handler = handler ?? {
			sessionUpdate: () => {
				throw RequestError.methodNotFound('session/update');
			},
			requestPermission: () => {
				throw RequestError.methodNotFound('permission/request');
			},
		};

		// Late-binding closure: reads this.handler at call time, not construction time.
		// This enables middleware to swap the handler after the connection is built.
		this.conn = new ClientSideConnection(
			() => ({
				requestPermission: (p) => this.handler.requestPermission(p),
				sessionUpdate: (p) => this.handler.sessionUpdate(p),
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
				extMethod: (method, p) => {
					if (!this.handler.extMethod)
						throw RequestError.methodNotFound(method);
					return this.handler.extMethod(method, p);
				},
				extNotification: (method, p) => {
					if (!this.handler.extNotification) return Promise.resolve();
					return this.handler.extNotification(method, p);
				},
			}),
			transport.stream,
		);
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
