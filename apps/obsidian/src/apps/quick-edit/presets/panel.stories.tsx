import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import {
	Button,
	CompactPopover,
	IconActionGroup,
	PortalContainerProvider,
} from '@franklin/ui';
import { PresetPanel } from './panel.js';
import { createDefaultPresets } from './defaults.js';
import { presetIcons } from './icons.js';

function PresetDemo({ mixed = false }: { mixed?: boolean }) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const caret = useRef<HTMLSpanElement | null>(null);
	const [open, setOpen] = useState(false);
	const [result, setResult] = useState('');
	const [text, setText] = useState('');
	const anchor = caret.current && {
		contextElement: caret.current,
		getBoundingClientRect: () =>
			caret.current?.getBoundingClientRect() ?? new DOMRect(100, 150, 1, 20),
	};
	const close = () => setOpen(false);
	const presets = createDefaultPresets();
	return (
		<div className="franklin" ref={setContainer}>
			<div className="box-border w-full max-w-lg bg-background px-4 pb-6 pt-32 text-foreground">
				<p className="text-sm">
					An outline point <span ref={caret}>▏</span>with surrounding text.
				</p>
				<Button onClick={() => setOpen(true)}>Open edit presets</Button>
				{open && container && anchor && (
					<PortalContainerProvider value={container}>
						{mixed ? (
							<CompactPopover
								anchor={anchor}
								label="Composed edit tools"
								onClose={close}
							>
								<div className="grid w-56 max-w-full gap-2 p-1">
									<IconActionGroup
										label="Presets"
										actions={presets.map((preset) => ({
											id: preset.id,
											label: preset.name,
											icon: presetIcons[preset.icon].icon,
										}))}
										onAction={(id) => setResult(id)}
									/>
									<textarea
										aria-label="Custom prompt"
										value={text}
										rows={3}
										onChange={(event) => setText(event.target.value)}
										className="w-full resize-y"
									/>
									<select aria-label="Writing style">
										<option>Brief</option>
										<option>Detailed</option>
									</select>
								</div>
							</CompactPopover>
						) : (
							<PresetPanel
								anchor={anchor}
								presets={presets}
								onClose={close}
								onSelect={(preset) => {
									setResult(preset.prompt);
									close();
								}}
							/>
						)}
					</PortalContainerProvider>
				)}
				{result && <p role="status">{result}</p>}
			</div>
		</div>
	);
}
const meta = {
	title: 'Quick edit/Presets',
	component: PresetDemo,
} satisfies Meta<typeof PresetDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const MixedControls: Story = { args: { mixed: true } };
