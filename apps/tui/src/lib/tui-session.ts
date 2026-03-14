import type { ReactAgentSession } from '@franklin/react-agents';

export type TuiSessionStatus = 'idle' | 'running' | 'error' | 'disposed';

export class TuiSession implements ReactAgentSession {
	readonly agentId: string;
	readonly control: ReactAgentSession['control'];
	readonly sessionId: string;
	readonly store: ReactAgentSession['store'];

	status: TuiSessionStatus = 'idle';

	private readonly onChange: () => void;

	constructor(
		agentId: string,
		session: ReactAgentSession,
		onChange: () => void,
	) {
		this.agentId = agentId;
		this.control = session.control;
		this.sessionId = session.sessionId;
		this.store = session.store;
		this.onChange = onChange;
	}

	async prompt(text: string): Promise<void> {
		if (this.status === 'disposed') return;

		const prompt = text.trim();
		if (!prompt) return;

		this.setStatus('running');

		try {
			await this.control.prompt({
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
		await this.control.dispose();
	}

	private setStatus(status: TuiSessionStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.onChange();
	}
}
