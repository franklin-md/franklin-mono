import { useId, useState, useSyncExternalStore } from 'react';
import { Button, Label } from '@franklin/ui';
import type { InboxController } from '../inbox/controller/controller.js';
import type { ModelSelection } from '../inbox/controller/types.js';
import { errorMessage } from '../inbox/controller/error.js';
import { questionSchema } from '../inbox/controller/question-schema.js';
import { SettingControl } from '../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

type Props = { inbox: InboxController };

const labels = {
	off: 'Off',
	minimal: 'Minimal',
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	xhigh: 'Extra high',
} satisfies Record<ModelSelection['reasoning'], string>;

export function InboxReasoningSetting({ inbox }: Props) {
	const id = useId();
	const reasoning = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() => inbox.state.get().preferences.reasoning,
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();

	async function save(value: string) {
		setPending(true);
		setError(undefined);
		try {
			await inbox.configure({
				reasoning: questionSchema.shape.reasoning.parse(value),
			});
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<Label htmlFor={id}>Reasoning level</Label>
				</SettingName>
				<SettingDescription>
					<span id={`${id}-description`}>
						Applies to new inbox questions, follow-ups and actions. Retries keep
						their original level.
					</span>
				</SettingDescription>
				{error && (
					<>
						<p role="alert" className="text-[var(--text-error)]">
							{error}
						</p>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={pending}
							onClick={() => void save(reasoning)}
						>
							Retry reasoning save
						</Button>
					</>
				)}
			</SettingInfo>
			<SettingControl>
				<select
					id={id}
					aria-describedby={`${id}-description`}
					value={reasoning}
					disabled={pending}
					onChange={(event) => void save(event.target.value)}
				>
					{questionSchema.shape.reasoning.options.map((value) => (
						<option key={value} value={value}>
							{labels[value]}
						</option>
					))}
				</select>
			</SettingControl>
		</SettingItem>
	);
}
