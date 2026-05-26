// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ToolUseBlock } from '@franklin/agent';
import type { ToolStatus } from '@franklin/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Bot } from 'lucide-react';

import { ToolCardChrome } from '../../../src/conversation/tools/chrome.js';
import {
	ToolSummary,
	ToolSummaryDetail,
} from '../../../src/conversation/tools/summary.js';

const block: ToolUseBlock = {
	kind: 'toolUse',
	call: {
		type: 'toolCall',
		id: 'call-1',
		name: 'read_file',
		arguments: {},
	},
	startedAt: 0,
};

function renderChrome({
	expanded,
	summary,
	status = 'success',
}: {
	expanded?: ReactNode;
	summary?: ReactNode;
	status?: ToolStatus;
} = {}) {
	return render(
		<ToolCardChrome
			block={block}
			status={status}
			summary={
				summary ?? (
					<>
						<span>Read</span>
						<ToolSummaryDetail>src/index.ts</ToolSummaryDetail>
					</>
				)
			}
			expanded={expanded}
		/>,
	);
}

describe('ToolCardChrome', () => {
	afterEach(cleanup);

	it('renders a non-expandable summary without a standalone status icon', () => {
		const { container } = renderChrome();

		const button = screen.getByRole('button', { name: 'Readsrc/index.ts' });

		expect(screen.getByText('Read')).toBeTruthy();
		expect(button).toHaveProperty('disabled', true);
		expect(container.querySelector('svg')).toBeNull();
	});

	it('toggles expanded content when details are available', () => {
		renderChrome({
			status: 'error',
			expanded: <div>Details</div>,
		});

		const button = screen.getByRole('button', { name: 'Readsrc/index.ts' });

		expect(button).toHaveProperty('disabled', false);
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByText('Details')).toBeNull();

		fireEvent.click(button);

		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByText('Details')).toBeTruthy();
	});

	it('applies a shared shimmer context while a tool is in progress', () => {
		renderChrome({
			status: 'in-progress',
			expanded: <div>Details</div>,
		});

		const button = screen.getByRole('button', { name: 'Readsrc/index.ts' });
		const busyRegion = screen.getByText('Read').closest('[aria-busy="true"]');
		const shimmer = button.querySelector('.shimmer');

		expect(busyRegion).toBeTruthy();
		expect(shimmer?.textContent).toBe('Readsrc/index.ts');
	});

	it('shimmers plain text without forcing nested badges to subscribe', () => {
		renderChrome({
			status: 'in-progress',
			summary: (
				<ToolSummary icon={Bot} label="Agent">
					<span className="rounded-sm bg-accent text-accent-foreground">
						Visual audit
					</span>
				</ToolSummary>
			),
		});

		const label = screen.getByText('Agent');
		const badge = screen.getByText('Visual audit');

		expect(label.className).toContain('shimmerable');
		expect(badge.closest('.shimmer')).toBeTruthy();
		expect(badge.className).not.toContain('shimmerable');
	});
});
