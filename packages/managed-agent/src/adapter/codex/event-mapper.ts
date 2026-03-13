import type { ManagedAgentEvent } from '../../messages/event.js';
import type {
	AgentMessageDeltaParams,
	CodexReasoningItem,
	CodexUserMessage,
	CommandApprovalParams,
	ErrorParams,
	FileChangeApprovalParams,
	ItemCompletedParams,
	ItemStartedParams,
	PermissionsApprovalParams,
	ReasoningSummaryTextDeltaParams,
	ReasoningTextDeltaParams,
} from './types.js';

// ---------------------------------------------------------------------------
// PendingApproval — stored by the adapter so that permission.resolve can
// send the correct JSON-RPC response back to Codex.
// ---------------------------------------------------------------------------

export type PendingApproval = {
	codexRequestId: number | string;
	codexMethod: string;
};

// ---------------------------------------------------------------------------
// mapNotification — pure function, no side effects.
// Returns an array because some Codex notifications map to zero Franklin
// events (e.g. unrecognised item types).
// ---------------------------------------------------------------------------

export function mapNotification(
	method: string,
	params: unknown,
): ManagedAgentEvent[] {
	switch (method) {
		case 'thread/started':
			return [];

		case 'turn/started':
			return [];

		case 'turn/completed':
			return [{ type: 'turn.completed' }];

		case 'item/started': {
			const p = params as ItemStartedParams;
			if (p.item.type === 'userMessage') {
				const item = p.item as CodexUserMessage;
				return [
					{
						type: 'item.started',
						item: {
							kind: 'user_message',
							text: getUserMessageText(item),
						},
					},
				];
			}
			if (p.item.type === 'agentMessage') {
				return [
					{
						type: 'item.started',
						item: { kind: 'assistant_message' },
					},
				];
			}
			if (p.item.type === 'reasoning') {
				return [
					{
						type: 'item.started',
						item: { kind: 'reasoning' },
					},
				];
			}
			// Unrecognised item type — silently ignored
			return [];
		}

		case 'item/completed': {
			const p = params as ItemCompletedParams;
			if (p.item.type === 'userMessage') {
				const item = p.item as CodexUserMessage;
				return [
					{
						type: 'item.completed',
						item: {
							kind: 'user_message',
							text: getUserMessageText(item),
						},
					},
				];
			}
			if (p.item.type === 'agentMessage') {
				return [
					{
						type: 'item.completed',
						item: {
							kind: 'assistant_message',
							text: 'text' in p.item ? p.item.text : '',
						},
					},
				];
			}
			if (p.item.type === 'reasoning') {
				const item = p.item as CodexReasoningItem;
				return [
					{
						type: 'item.completed',
						item: {
							kind: 'reasoning',
							text: item.content?.join('') ?? '',
						},
					},
				];
			}
			return [];
		}

		case 'item/agentMessage/delta': {
			const p = params as AgentMessageDeltaParams;
			return [
				{
					type: 'item.delta',
					item: {
						kind: 'assistant_message',
						textDelta: p.delta?.text ?? '',
					},
				},
			];
		}

		case 'item/reasoning/textDelta': {
			const p = params as ReasoningTextDeltaParams;
			return [
				{
					type: 'item.delta',
					item: { kind: 'reasoning', textDelta: p.delta },
				},
			];
		}

		case 'item/reasoning/summaryTextDelta': {
			const p = params as ReasoningSummaryTextDeltaParams;
			return [
				{
					type: 'item.delta',
					item: { kind: 'reasoning', textDelta: p.delta },
				},
			];
		}

		case 'item/reasoning/summaryPartAdded':
			return [];

		case 'error': {
			const p = params as ErrorParams;
			return [
				{
					type: 'error',
					error: {
						code: p.error.code ?? 'CODEX_ERROR',
						message: p.error.message,
					},
				},
			];
		}

		case 'thread/closed':
			return [{ type: 'agent.exited' }];

		default:
			return [];
	}
}

function getUserMessageText(item: CodexUserMessage): string {
	if (typeof item.text === 'string') {
		return item.text;
	}

	if (!item.content) {
		return '';
	}

	return item.content.map((segment) => segment.text).join('');
}

// ---------------------------------------------------------------------------
// mapServerRequest — maps Codex approval requests to Franklin
// permission.requested events, returning the PendingApproval record the
// adapter needs to later correlate permission.resolve.
// ---------------------------------------------------------------------------

export function mapServerRequest(
	method: string,
	id: number | string,
	params: unknown,
): { event: ManagedAgentEvent; pendingApproval: PendingApproval } | null {
	const pending: PendingApproval = { codexRequestId: id, codexMethod: method };

	switch (method) {
		case 'command/approve': {
			const p = params as CommandApprovalParams;
			return {
				event: {
					type: 'permission.requested',
					payload: {
						kind: 'generic',
						message: `Approve command: ${p.command.command}`,
					},
				},
				pendingApproval: pending,
			};
		}

		case 'file/approve': {
			const p = params as FileChangeApprovalParams;
			return {
				event: {
					type: 'permission.requested',
					payload: {
						kind: 'generic',
						message: `Approve file change: ${p.file.path}`,
					},
				},
				pendingApproval: pending,
			};
		}

		case 'permissions/approve': {
			const p = params as PermissionsApprovalParams;
			return {
				event: {
					type: 'permission.requested',
					payload: {
						kind: 'generic',
						message: `Approve permissions: ${p.permissions.join(', ')}`,
					},
				},
				pendingApproval: pending,
			};
		}

		default:
			return null;
	}
}
