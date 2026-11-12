// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { captureInboxSelection } from '../capture.js';
import { createInboxDirectiveScenario } from '../testing/scenario.js';
import { createDirectiveTestEditor } from '../../../../shared/directives/testing/editor.js';

let scenario: Awaited<ReturnType<typeof createInboxDirectiveScenario>>;
let target: ReturnType<typeof createDirectiveTestEditor>;

beforeEach(async () => {
	scenario = await createInboxDirectiveScenario();
	target = createDirectiveTestEditor('Why does this work?\nAnother question');
});
afterEach(async () => {
	await scenario.service.dispose();
	await scenario.inbox.dispose();
	await scenario.registry.dispose();
	target.destroy();
});

function capture() {
	const selection = captureInboxSelection({
		editor: target.editor,
		view: target.info,
		inbox: scenario.inbox,
		definition: scenario.service.definition,
	});
	if (!selection) throw new Error('Expected a captured selection');
	return selection;
}

it('freezes source text before focus moves and follows the original line through edits', async () => {
	const selection = capture();
	target.cm.dispatch({
		changes: { from: 0, insert: 'Introduction\n' },
		selection: { anchor: 0 },
	});
	await selection.submit();
	expect(scenario.inbox.state.get().questions[0]).toMatchObject({
		text: 'Why does this work?',
		source: { quote: 'Why does this work?' },
	});
	expect(target.editor.getValue()).toMatch(
		/Introduction\nWhy does this work\? :::franklin:inbox-question:/,
	);
	selection.dispose();
});

it('retries saving the same question after its first save fails', async () => {
	const selection = capture();
	vi.mocked(scenario.persistence.save).mockRejectedValueOnce(
		new Error('disk full'),
	);
	await expect(selection.submit()).rejects.toThrow('disk full');
	const id = scenario.inbox.state.get().questions[0]?.id;
	await selection.submit();
	expect(scenario.inbox.state.get().questions).toHaveLength(1);
	expect(scenario.inbox.state.get().questions[0]?.id).toBe(id);
	expect(scenario.service.definition.instances()).toHaveLength(1);
	selection.dispose();
});

it('retries only the pill after the question was saved', async () => {
	const selection = capture();
	vi.spyOn(scenario.service.definition, 'create').mockRejectedValueOnce(
		new Error('pill save failed'),
	);
	await expect(selection.submit()).rejects.toThrow('pill save failed');
	await selection.submit();
	expect(scenario.inbox.state.get().questions).toHaveLength(1);
	expect(scenario.service.definition.instances()).toHaveLength(1);
	selection.dispose();
});

it('shares concurrent submissions and inserts one pill', async () => {
	const selection = capture();
	await Promise.all([selection.submit(), selection.submit()]);
	expect(scenario.inbox.state.get().questions).toHaveLength(1);
	expect(
		target.editor.getValue().match(/:::franklin:inbox-question:/g),
	).toHaveLength(1);
	selection.dispose();
});
