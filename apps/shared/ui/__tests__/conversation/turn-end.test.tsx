// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AgentStopCode } from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { AuthActionProvider, TurnEndBlock } from '@franklin/react';

import { defaultRegistry } from '../../src/conversation/turn/turn-end/registry.js';

afterEach(cleanup);

function renderTurnEnd(stopCode: AgentStopCode, stopMessage?: string) {
	const requestApiKey = vi.fn();
	render(
		<AuthActionProvider handlers={{ requestApiKey }}>
			<TurnEndBlock
				block={{
					kind: 'turnEnd',
					stopCode,
					...(stopMessage ? { stopMessage } : {}),
					startedAt: 0,
					endedAt: 0,
				}}
				registry={defaultRegistry}
				actions={<button type="button">Retry</button>}
			/>
		</AuthActionProvider>,
	);
	return { requestApiKey };
}

describe('turn-end renderers', () => {
	it.each([StopCode.AuthKeyInvalid, StopCode.AuthKeyNotSpecified])(
		'offers connections for credential failure %s with host actions',
		(stopCode) => {
			const { requestApiKey } = renderTurnEnd(stopCode, 'refresh_token_reused');
			const alert = screen.getByRole('alert');
			expect(alert.textContent).toContain('refresh_token_reused');
			fireEvent.click(screen.getByRole('button', { name: 'Open connections' }));
			expect(requestApiKey).toHaveBeenCalledOnce();
			expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
		},
	);

	it('shows other failures and host actions without a connections action', () => {
		renderTurnEnd(StopCode.ProviderError, '529: overloaded');
		expect(screen.getByRole('alert').textContent).toContain('529: overloaded');
		expect(
			screen.queryByRole('button', { name: 'Open connections' }),
		).toBeNull();
		expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
	});

	it('reports a truncated response as a status, not an alert', () => {
		renderTurnEnd(StopCode.MaxTokens);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole('status').textContent).toContain('cut short');
	});
});
