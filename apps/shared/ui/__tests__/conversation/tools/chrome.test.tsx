// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ToolUseBlock } from '@franklin/agent';
import type { ToolStatus } from '@franklin/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ToolCardChrome } from '../../../src/conversation/tools/chrome.js';
import { ToolSummaryDetail } from '../../../src/conversation/tools/summary.js';

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
	status = 'success',
}: {
	expanded?: ReactNode;
	status?: ToolStatus;
} = {}) {
	return render(
		<ToolCardChrome
			block={block}
			status={status}
			summary={
				<>
					<span>Read</span>
					<ToolSummaryDetail>src/index.ts</ToolSummaryDetail>
				</>
			}
			expanded={expanded}
		/>,
	);
}

describe('ToolCardChrome', () => {
	afterEach(cleanup);

	it('renders the summary without a standalone status icon', () => {
		const { container } = renderChrome();

		expect(screen.getByText('Read')).toBeTruthy();
		expect(container.querySelector('svg')).toBeNull();
	});

	it('keeps status styling on the summary row wrapper', () => {
		renderChrome({
			status: 'error',
			expanded: <div>Details</div>,
		});

		const button = screen.getByRole('button', { name: 'Readsrc/index.ts' });
		const row = button.parentElement;

		expect(row).toBeTruthy();
		expect(row).not.toBe(button);
		expect(row?.dataset.status).toBe('error');
		expect(row?.className).toContain('text-destructive');
		expect(row?.className).toContain('hover:bg-destructive/10');
		expect(button.className).toContain('text-current');
		expect(button.className).toContain('hover:bg-transparent');
		expect(button.className).toContain('hover:text-current');
	});

	it('applies a text-only shimmer treatment while a tool is in progress', () => {
		renderChrome({
			status: 'in-progress',
			expanded: <div>Details</div>,
		});

		const button = screen.getByRole('button', { name: 'Readsrc/index.ts' });
		const row = button.parentElement;

		expect(row?.dataset.status).toBe('in-progress');
		expect(row?.getAttribute('aria-busy')).toBe('true');
		expect(row?.className).not.toContain('franklin-tool-row-shimmer');
		const summaryWrapper = button.querySelector('.franklin-tool-shimmer');

		expect(summaryWrapper).toBe(button.firstElementChild);
		expect(summaryWrapper?.querySelector('.franklin-tool-shimmer')).toBeNull();
		expect(button.querySelector('.franklin-tool-shimmer-text')).toBeNull();
		expect(button.className).toContain('bg-transparent');
		expect(button.className).toContain('text-current');
	});
});

describe('ToolSummaryDetail', () => {
	afterEach(cleanup);

	it('inherits row color while staying visually secondary', () => {
		render(<ToolSummaryDetail>src/index.ts</ToolSummaryDetail>);

		const detail = screen.getByText('src/index.ts');
		expect(detail.className).toContain('text-current');
		expect(detail.className).toContain('opacity-50');
	});
});
