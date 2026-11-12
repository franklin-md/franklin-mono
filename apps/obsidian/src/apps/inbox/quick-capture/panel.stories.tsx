import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { expect, within } from 'storybook/test';
import { Button, PortalContainerProvider } from '@franklin/ui';
import { createDirectiveTestEditor } from '../../../shared/directives/testing/editor.js';
import { captureDirectiveTarget } from '../../../shared/directives/scribe/target.js';
import type { DirectiveWriteTarget } from '../../../shared/directives/scribe/types.js';
import { createEditorAnchor } from '../../../shared/ui/editor-popover/anchor.js';
import { CapturePanel } from './panel.js';

type Props = { fail?: boolean; narrow?: boolean; nearTop?: boolean };
type Popup = {
	anchor: ReturnType<typeof createEditorAnchor>;
	target: DirectiveWriteTarget;
};

function CaptureDemo({ fail = false, narrow = false, nearTop = false }: Props) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null);
	const editor = useRef<ReturnType<typeof createDirectiveTestEditor> | null>(
		null,
	);
	const [popup, setPopup] = useState<Popup>();
	const [result, setResult] = useState('');
	useEffect(() => {
		if (!editorHost) return;
		const current = createDirectiveTestEditor(
			[
				'- Parent topic',
				'  - Why do we recheck the condition after waking? This long outline item wraps in narrow panes.',
				'  - Keep the surrounding outline intact.',
			].join('\n'),
		);
		editorHost.append(current.cm.dom);
		current.cm.dispatch({
			effects: StateEffect.appendConfig.of([
				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ 'aria-label': 'Outline note' }),
				EditorView.theme({
					'&': { fontSize: '14px', color: 'var(--text-normal)' },
					'.cm-content': { padding: '12px 0' },
					'.cm-line': { padding: '0 8px' },
				}),
			]),
			selection: {
				anchor: nearTop ? 2 : current.cm.state.doc.line(2).from + 15,
			},
		});
		editor.current = current;
		return () => {
			current.destroy();
			editor.current = null;
		};
	}, [editorHost, nearTop]);
	useEffect(
		() => () => {
			popup?.anchor.dispose();
			popup?.target.dispose();
		},
		[popup],
	);
	function close(restoreFocus: boolean) {
		setPopup(undefined);
		if (restoreFocus) editor.current?.cm.focus();
	}
	return (
		<div className="franklin" ref={setContainer}>
			<div
				className="box-border w-full max-w-lg bg-background px-4 pb-6 text-foreground"
				style={{
					paddingTop: nearTop ? 0 : 120,
					maxWidth: narrow ? 280 : undefined,
				}}
			>
				<div
					ref={setEditorHost}
					className="rounded-md bg-background ring-1 ring-border"
				/>
				<Button
					className="mt-4"
					variant="outline"
					onClick={() => {
						const current = editor.current;
						if (!current || popup) return;
						const target = captureDirectiveTarget(
							current.editor,
							current.info,
							current.editor.getCursor().line,
						);
						setPopup({
							target,
							anchor: createEditorAnchor(current.editor, () => {
								target.resolve();
							}),
						});
					}}
				>
					Open capture chooser
				</Button>
				{popup && container && (
					<PortalContainerProvider value={container}>
						<CapturePanel
							anchor={popup.anchor}
							onClose={close}
							onSubmit={async (action) => {
								if (fail)
									throw new Error('Inbox could not be saved. Try again.');
								setResult(
									action === 'quick-add'
										? 'Question queued'
										: 'Thought dump queued',
								);
								close(true);
							}}
						/>
					</PortalContainerProvider>
				)}
				{result && <p role="status">{result}</p>}
			</div>
		</div>
	);
}

const meta = {
	title: 'Inbox/Capture chooser',
	component: CaptureDemo,
} satisfies Meta<typeof CaptureDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WrappedOutline: Story = { args: { narrow: true } };
export const ViewportEdge: Story = { args: { nearTop: true } };
export const SaveFailure: Story = { args: { fail: true } };

export const TooltipTracksEntrance: Story = {
	play: async ({ canvasElement }) => {
		const win = canvasElement.ownerDocument.defaultView;
		if (!win) throw new Error('Expected a browser window');
		const errors: number[] = [];
		const start = win.performance.now();
		// Sample just after the entrance, before the delayed layout observer can
		// conceal stale coordinates. jsdom does not model animated CSS transforms.
		const sampled = new Promise<void>((resolve) => {
			const frame = () => {
				const elapsed = win.performance.now() - start;
				if (elapsed >= 250 && elapsed < 500) {
					const trigger = canvasElement.querySelector<HTMLElement>(
						'[role="dialog"] button[aria-label="Quick add"]',
					);
					const tooltip =
						canvasElement.querySelector('[role="tooltip"]')?.parentElement;
					if (trigger && tooltip) {
						const rect = tooltip.getBoundingClientRect();
						if (rect.top >= 0)
							errors.push(
								Math.abs(trigger.getBoundingClientRect().top - rect.bottom - 6),
							);
					}
				}
				if (elapsed < 500) win.requestAnimationFrame(frame);
				else resolve();
			};
			win.requestAnimationFrame(frame);
		});
		within(canvasElement)
			.getByRole('button', { name: 'Open capture chooser' })
			.click();
		await sampled;
		await expect(errors.length).toBeGreaterThan(0);
		await expect(Math.max(...errors)).toBeLessThan(1);
	},
};
