import type { ReactAgentSession } from '@franklin/react-agents';

export type TuiSessionStatus = 'idle' | 'running' | 'error' | 'disposed';

export class TuiSession implements ReactAgentSession {
	readonly agentId: string;
	readonly commands: ReactAgentSession['commands'];
	readonly sessionId: string;
	readonly store: ReactAgentSession['store'];

	private readonly _dispose: () => Promise<void>;

	status: TuiSessionStatus = 'idle';

	private readonly onChange: () => void;

	constructor(
		agentId: string,
		session: ReactAgentSession,
		onChange: () => void,
	) {
		this.agentId = agentId;
		this.commands = session.commands;
		this.sessionId = session.sessionId;
		this.store = session.store;
		this._dispose = () => session.dispose();
		this.onChange = onChange;
	}

	async prompt(text: string): Promise<void> {
		if (this.status === 'disposed') return;

		const prompt = text.trim();
		if (!prompt) return;

		this.setStatus('running');

		try {
			await this.commands.prompt({
				sessionId: this.sessionId,
				prompt: [{ type: 'text', text: prompt }],
			});
			this.setStatus('idle');
		} catch {
			this.setStatus('error');
		}
	}

	async dispose(): Promise<void> {
		if (this.status === 'disposed') return;
		this.setStatus('disposed');
		await this._dispose();
	}

	private setStatus(status: TuiSessionStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.onChange();
	}
}
