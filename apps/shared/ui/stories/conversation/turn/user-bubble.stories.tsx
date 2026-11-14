import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { formatReferenceMention } from '@franklin/agent';

import { userTextPrompt } from '../../fixtures.js';
import { UserBubble } from '../../../src/conversation/turn/user-bubble.js';

const meta = {
	title: 'Conversation/UserBubble',
	component: UserBubble,
} satisfies Meta<typeof UserBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { message: userTextPrompt },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).queryByRole('button', { name: 'Show more' }),
		).not.toBeInTheDocument();
	},
};

export const LongMessage: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: [
						'Please review this implementation and explain the tradeoffs. '.repeat(
							12,
						),
						'## Requirements',
						'- Keep the original formatting.\n- Preserve the complete message when expanded.',
						'Finish with [the source](https://example.com).',
					].join('\n\n'),
				},
			],
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = await canvas.findByRole('button', {
			name: 'Show more',
			expanded: false,
		});
		const contentId = toggle.getAttribute('aria-controls');
		const content =
			contentId && canvasElement.ownerDocument.getElementById(contentId);
		if (!content) throw new Error('Message content missing');
		const collapsedHeight = content.getBoundingClientRect().height;
		await expect(collapsedHeight).toBeCloseTo(
			parseFloat(getComputedStyle(content).lineHeight) * 3,
			0,
		);
		await expect(content.scrollHeight).toBeGreaterThan(collapsedHeight);

		toggle.focus();
		await userEvent.keyboard('{Enter}');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(toggle).toHaveTextContent('Show less');
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			);
			await expect(content.getBoundingClientRect().height).toBeGreaterThan(
				collapsedHeight,
			);
			await expect(content.getBoundingClientRect().height).toBeLessThan(
				content.scrollHeight,
			);
		}
		await waitFor(async () => {
			await expect(content.getBoundingClientRect().height).toBeCloseTo(
				content.scrollHeight,
				0,
			);
		});
		await expect(
			canvas.getByRole('link', { name: 'the source' }),
		).toBeVisible();
		await expect(
			canvas.getByRole('heading', { name: 'Requirements' }),
		).toBeVisible();

		await userEvent.keyboard(' ');
		await waitFor(async () => {
			await expect(toggle).toHaveAttribute('aria-expanded', 'false');
			await expect(content.getBoundingClientRect().height).toBe(
				collapsedHeight,
			);
		});

		await userEvent.click(toggle);
		await waitFor(async () => {
			await expect(content.getBoundingClientRect().height).toBeCloseTo(
				content.scrollHeight,
				0,
			);
		});
		const link = canvas.getByRole('link', { name: 'the source' });
		link.addEventListener('click', (event) => event.preventDefault(), {
			once: true,
		});
		await userEvent.click(link);
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');

		const heading = canvas.getByRole('heading', { name: 'Requirements' });
		const selection = canvasElement.ownerDocument.getSelection();
		const range = canvasElement.ownerDocument.createRange();
		range.selectNodeContents(heading);
		selection?.removeAllRanges();
		selection?.addRange(range);
		await expect(selection?.toString()).toBe('Requirements');
		heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => resolve()),
		);
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		selection?.removeAllRanges();

		await userEvent.click(heading);
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await waitFor(async () => {
			await expect(content.getBoundingClientRect().height).toBe(
				collapsedHeight,
			);
		});
	},
};

export const WithMarkdownAndFileReference: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: `Read ~~the old draft~~ ${formatReferenceMention({
						locator: 'notes/deep work.md',
						label: 'notes/deep work.md',
					})} and compare it with ${formatReferenceMention({
						locator: 'src/conversation/turn/user-bubble.tsx',
						label: 'src/conversation/turn/user-bubble.tsx',
					})}.`,
				},
			],
		},
	},
};

export const MultipleTextBlocks: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{ type: 'text', text: 'First block. ' },
				{ type: 'text', text: 'Second block.' },
			],
		},
	},
};
