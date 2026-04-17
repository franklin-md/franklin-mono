// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConversationPanel } from '../../src/conversation/panel.js';
import { MockAgentDecorator } from '../../stories/mock-agent.js';

describe('ConversationPanel', () => {
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
});
