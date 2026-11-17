// @vitest-environment jsdom

import {
	filesystemBundle,
	type AssistantBlock,
	type ConversationTurn,
} from '@franklin/agent';
import type * as FranklinReact from '@franklin/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const conversation = vi.hoisted(() => ({ turns: [] as ConversationTurn[] }));

vi.mock('@franklin/react', async (importOriginal) => ({
	...(await importOriginal<typeof FranklinReact>()),
	useThrottledConversationTurns: () => conversation.turns,
	Prompt: () => null,
}));

import { ConversationPanel } from '../conversation.js';

afterEach(cleanup);

function renderConversation(blocks: AssistantBlock[]) {
	conversation.turns = [
		{
			id: 'turn',
			timestamp: Date.now(),
			prompt: { role: 'user', content: [{ type: 'text', text: 'Question' }] },
			response: { blocks },
		},
	];
	return render(<ConversationPanel />);
}

describe('Obsidian conversation activity', () => {
	it('keeps successful housekeeping tools out of the activity disclosure', () => {
		renderConversation([
			{
				kind: 'toolUse',
				call: {
					type: 'toolCall',
					id: 'title',
					name: 'set_chat_title',
					arguments: { title: 'New title' },
				},
				startedAt: 0,
				result: { content: [] },
			},
			{ kind: 'text', text: 'The answer', startedAt: 1 },
		]);

		expect(screen.getByText('The answer')).toBeTruthy();
		expect(screen.queryByRole('button', { expanded: false })).toBeNull();
	});

	it('uses the Obsidian file summary in both the activity header and tool row', () => {
		renderConversation([
			{
				kind: 'toolUse',
				call: {
					type: 'toolCall',
					id: 'read',
					name: filesystemBundle.tools.readFile.name,
					arguments: { path: '[[MEMORY]]' },
				},
				startedAt: 0,
			},
		]);

		fireEvent.click(screen.getByRole('button', { name: /Read MEMORY/ }));
		expect(screen.getAllByText('MEMORY')).toHaveLength(2);
		expect(screen.queryByText('[[MEMORY]]')).toBeNull();
	});
});
