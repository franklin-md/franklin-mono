// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationPanel } from '../../src/conversation/panel.js';
import { MockAgentDecorator } from '../../stories/mock-agent.js';

describe('ConversationPanel', () => {
	afterEach(cleanup);

	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: vi.fn(),
		});
	});

	it('renders additional controls inside the prompt controls', () => {
		render(
			<MockAgentDecorator>
				<div className="flex h-[600px]">
					<ConversationPanel
						additionalControls={[
							<button key="one" data-testid="control-one" />,
							<button key="two" data-testid="control-two" />,
						]}
					/>
				</div>
			</MockAgentDecorator>,
		);

		expect(screen.getByTestId('control-one')).toBeTruthy();
		expect(screen.getByTestId('control-two')).toBeTruthy();
	});

	it('passes the empty placeholder into the conversation view', () => {
		render(
			<MockAgentDecorator>
				<div className="flex h-[600px]">
					<ConversationPanel
						components={{
							EmptyPlaceholder: () => (
								<div data-testid="empty-placeholder">Quick start</div>
							),
						}}
					/>
				</div>
			</MockAgentDecorator>,
		);

		expect(screen.getByTestId('empty-placeholder')).toBeTruthy();
	});
});
