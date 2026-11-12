// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveRegistry } from '../../../../shared/directives/registry.js';
import { DirectiveComponent } from '../../../../shared/directives/render/component.js';
import { InboxQuestionDirectives } from '../controller.js';
import { createInboxDirectiveScenario } from '../testing/scenario.js';

afterEach(cleanup);

describe('Inbox question directives', () => {
	it('reacts to answers, opens the exact question, and cleans every copied reference after saved deletion', async () => {
		const h = await createInboxDirectiveScenario();
		const id = await h.inbox.add('Why?');
		const instance = await h.service.definition.create({ questionId: id });
		h.content = `Question ${instance.text}\n\nCopy ${instance.text}`;
		render(<DirectiveComponent registry={h.registry} reference={instance} />);
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		expect(screen.getByRole('button').textContent).toContain('Thinking');
		const request = h.requests[0];
		if (!request) throw new Error('Expected an active question');
		await act(() => request.submit('Because.'));
		fireEvent.click(
			screen.getByRole('button', { name: 'View answer in Inbox' }),
		);
		expect(h.open).toHaveBeenCalledWith(id);
		await act(() => h.inbox.remove(id));
		await vi.waitFor(() => expect(h.content).toBe('Question \n\nCopy '));
		expect(h.service.definition.get(instance.id)).toBeDefined();
		await h.service.dispose();
		await h.inbox.dispose();
		await h.registry.dispose();
	});

	it('keeps note references when deletion fails to save, then cleans them after Retry save', async () => {
		const h = await createInboxDirectiveScenario();
		const id = await h.inbox.add('Why?');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		const instance = await h.service.definition.create({ questionId: id });
		h.content = instance.text;
		vi.spyOn(h.persistence, 'save').mockRejectedValueOnce(
			new Error('disk full'),
		);
		await expect(h.inbox.remove(id)).rejects.toThrow('disk full');
		expect(h.content).toBe(instance.text);
		await h.inbox.retrySave();
		await vi.waitFor(() => expect(h.content).toBe(''));
		await h.service.dispose();
		await h.inbox.dispose();
		await h.registry.dispose();
	});

	it('retries partial cleanup after restoring both stores, without deleting references to existing questions', async () => {
		const h = await createInboxDirectiveScenario();
		const id = await h.inbox.add('Keep me');
		await vi.waitFor(() => expect(h.requests).toHaveLength(1));
		const keep = await h.service.definition.create({ questionId: id });
		const gone = await h.service.definition.create({ questionId: 'deleted' });
		h.content = keep.text + gone.text;
		h.process.mockRejectedValueOnce(new Error('locked'));
		await h.inbox.configure({ concurrency: 2 });
		await vi.waitFor(() => expect(h.error).toHaveBeenCalled());
		expect(h.content).toContain(gone.text);
		await h.service.dispose();
		await h.registry.dispose();
		const registry = await DirectiveRegistry.create({
			app: h.app,
			persistence: h.storage,
		});
		const service = new InboxQuestionDirectives({
			registry,
			inbox: h.inbox,
			onOpen: h.open,
			onError: h.error,
		});
		await vi.waitFor(() => expect(h.content).toBe(keep.text));
		await service.dispose();
		await h.inbox.dispose();
		await registry.dispose();
	});
	it('shows a failed question and follows the same instance through retry', async () => {
		let attempts = 0;
		const h = await createInboxDirectiveScenario(async (request) => {
			if (attempts++ === 0) throw new Error('offline');
			await request.submit('Recovered answer');
		});
		const id = await h.inbox.add('Retry me');
		const instance = await h.service.definition.create({ questionId: id });
		render(<DirectiveComponent registry={h.registry} reference={instance} />);
		await screen.findByRole('button', { name: 'Open question in Inbox' });
		expect(screen.getByRole('button').title).toBe('offline');
		await act(() => h.inbox.retry(id));
		await screen.findByRole('button', { name: 'View answer in Inbox' });
		expect(h.service.definition.instances()).toHaveLength(1);
		await h.service.dispose();
		await h.inbox.dispose();
		await h.registry.dispose();
	});
});
