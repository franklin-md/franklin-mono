// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type {
	AssistantBlock,
	ConversationTurn,
	ToolUseBlock,
} from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { FileText, Pencil, Search, Terminal } from 'lucide-react';
import {
	createToolRendererRegistry,
	type ConversationComponents,
} from '@franklin/react';

import { ConversationView } from '../../src/conversation/view.js';

function tool(
	id: string,
	name = 'read',
	result?: ToolUseBlock['result'],
): ToolUseBlock {
	return {
		kind: 'toolUse',
		call: { id, type: 'toolCall', name, arguments: {} },
		startedAt: 0,
		result,
	};
}

const success = { content: [{ type: 'text' as const, text: 'Tool output' }] };
const text = (value: string): AssistantBlock => ({
	kind: 'text',
	text: value,
	startedAt: 0,
});
const thinking: AssistantBlock = {
	kind: 'thinking',
	text: 'Private reasoning',
	startedAt: 0,
	endedAt: 1,
};
const finished: AssistantBlock = {
	kind: 'turnEnd',
	stopCode: StopCode.Finished,
	startedAt: 20_000,
	endedAt: 20_000,
};
const registry = createToolRendererRegistry([
	[
		'read',
		{
			icon: () => FileText,
			summary: ({ block }) => <span>Read {block.call.id}</span>,
			expanded: () => <div>Tool output</div>,
		},
	],
	['hidden', { summary: () => null }],
	['search', { icon: () => Search, summary: () => 'Search' }],
	['grep', { icon: () => Search, summary: () => 'Grep' }],
	['edit', { icon: () => Pencil, summary: () => 'Edit' }],
	['run', { icon: () => Terminal, summary: () => 'Run' }],
]);
const renderers: Partial<ConversationComponents> = {
	Text: ({ block }) => <div>{block.text}</div>,
	Thinking: ({ block }) => <div>{block.text}</div>,
	Footer: () => null,
};

function activityTurn(blocks: AssistantBlock[]): ConversationTurn {
	return {
		id: 'activity',
		timestamp: 0,
		prompt: { role: 'user', content: [{ type: 'text', text: 'Question' }] },
		response: { blocks },
	};
}

describe('Conversation activity', () => {
	afterEach(cleanup);

	it('collapses thinking and earlier actions while showing the current tool', () => {
		render(
			<ConversationView
				turns={[
					activityTurn([
						thinking,
						text('Checking notes'),
						tool('one', 'read', success),
						tool('two'),
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.queryByText('Private reasoning')).toBeNull();
		expect(screen.queryByText('Checking notes')).toBeNull();
		expect(screen.queryByText('Read one')).toBeNull();
		const toggle = screen.getByRole('button', { name: /Read two/ });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(toggle);
		expect(screen.getByText('Private reasoning')).toBeTruthy();
		expect(screen.getByText('Checking notes')).toBeTruthy();
		expect(screen.getByText('Read one')).toBeTruthy();
		fireEvent.click(
			screen.getByRole('button', { name: 'Read two', expanded: false }),
		);
		expect(screen.getByText('Tool output')).toBeTruthy();
	});

	it('updates the current tool and preserves an explicitly opened disclosure', () => {
		const { rerender } = render(
			<ConversationView
				turns={[activityTurn([tool('one')])]}
				toolRegistry={registry}
				components={{ ...renderers }}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: /Read one/ }));
		rerender(
			<ConversationView
				turns={[activityTurn([tool('one', 'read', success), tool('two')])]}
				toolRegistry={registry}
				components={{ ...renderers }}
			/>,
		);
		expect(
			screen.getByRole('button', { name: /Read two/, expanded: true }),
		).toBeTruthy();
		expect(screen.getByText('Read one')).toBeTruthy();
	});

	it('summarizes a completed response and leaves the answer visible', () => {
		render(
			<ConversationView
				turns={[
					activityTurn([
						thinking,
						text('Checking notes'),
						tool('one', 'read', success),
						text('The answer'),
						finished,
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(
			screen.getByRole('button', {
				name: /Thought · 1 tool call/,
				expanded: false,
			}),
		).toBeTruthy();
		expect(screen.getByText('20s')).toBeTruthy();
		expect(screen.getByText('The answer')).toBeTruthy();
		expect(screen.queryByText('Checking notes')).toBeNull();
		fireEvent.click(screen.getByRole('button', { expanded: false }));
		expect(screen.getByText('Checking notes')).toBeTruthy();
	});

	it('keeps the trailing answer visible while it streams and folds it if another tool follows', () => {
		const { rerender } = render(
			<ConversationView
				turns={[
					activityTurn([
						tool('one', 'read', success),
						text('A preliminary answer'),
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.getByText('Writing response…')).toBeTruthy();
		expect(screen.getByText('A preliminary answer')).toBeTruthy();
		rerender(
			<ConversationView
				turns={[
					activityTurn([
						tool('one', 'read', success),
						text('A preliminary answer'),
						tool('two'),
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.queryByText('A preliminary answer')).toBeNull();
		expect(screen.getByText('Read two')).toBeTruthy();
	});

	it('does not hide turn errors or tool failures inside the disclosure', () => {
		const failed = tool('one', 'read', { ...success, isError: true });
		const stopped: AssistantBlock = {
			...finished,
			kind: 'turnEnd',
			stopCode: StopCode.ProviderError,
			stopMessage: 'Connection lost',
		};
		render(
			<ConversationView
				turns={[activityTurn([failed, stopped])]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.getByText('1 error')).toBeTruthy();
		expect(screen.getByText('Connection lost')).toBeTruthy();
	});

	it('does not include host-hidden tools in the completed tool count', () => {
		render(
			<ConversationView
				turns={[
					activityTurn([
						tool('title', 'hidden', success),
						tool('one', 'read', success),
						text('The answer'),
						finished,
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.getByRole('button', { name: /1 tool call/ })).toBeTruthy();
		expect(screen.queryByText('hidden')).toBeNull();
	});

	it('keeps an older parallel tool visible while it is still running', () => {
		render(
			<ConversationView
				turns={[activityTurn([tool('one'), tool('two', 'read', success)])]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.getByText('Read one')).toBeTruthy();
		expect(screen.queryByText('Read two')).toBeNull();
	});

	it('does not show an empty disclosure for a response with only host-hidden tools', () => {
		render(
			<ConversationView
				turns={[
					activityTurn([
						tool('title', 'hidden', success),
						text('The answer'),
						finished,
					]),
				]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.queryByRole('button', { expanded: false })).toBeNull();
		expect(screen.getByText('The answer')).toBeTruthy();
	});

	it.each([
		{ completed: true, count: 1 },
		{ completed: false, count: 0 },
	])(
		'shows $count tool icons when completed=$completed',
		({ completed, count }) => {
			const blocks = [
				tool('title', 'hidden', success),
				...['one', 'two', 'three', 'four'].map((id) =>
					tool(id, 'read', success),
				),
			];
			render(
				<ConversationView
					turns={[activityTurn(completed ? [...blocks, finished] : blocks)]}
					toolRegistry={registry}
					components={renderers}
				/>,
			);
			const icons = screen.queryAllByTitle('read');
			expect(icons).toHaveLength(count);
			for (const icon of icons) {
				expect(icon.querySelector('.lucide-file-text')).toBeTruthy();
			}
			expect(screen.queryByTitle('hidden')).toBeNull();
		},
	);

	it('caps the summary at three distinct icons, including tools that share an icon', () => {
		const calls = ['read', 'read', 'search', 'grep', 'edit', 'run'].map(
			(name, index) => tool(String(index), name, success),
		);
		render(
			<ConversationView
				turns={[activityTurn([...calls, finished])]}
				toolRegistry={registry}
				components={renderers}
			/>,
		);
		expect(screen.getAllByTitle('read')).toHaveLength(1);
		expect(screen.getAllByTitle('search')).toHaveLength(1);
		expect(screen.getAllByTitle('edit')).toHaveLength(1);
		expect(screen.queryByTitle('grep')).toBeNull();
		expect(screen.queryByTitle('run')).toBeNull();
	});
});
