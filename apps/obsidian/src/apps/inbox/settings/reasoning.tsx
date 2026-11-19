import { useId, useState, useSyncExternalStore } from 'react';
import { THINKING_LEVELS } from '@franklin/mini-acp';
import { Button, EFFORT_LABELS } from '@franklin/ui';
import type { InboxController } from '../controller/index.js';
import { errorMessage } from '../controller/error.js';
import { questionSchema } from '../controller/question-schema.js';
import { SettingControl } from '../../../shared/ui/setting/control.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingError } from '../../../shared/ui/setting/error.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';
import { SettingSelect } from '../../../shared/ui/setting/select.js';

type Props = { inbox: InboxController };

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
				<SettingName htmlFor={id}>Reasoning level</SettingName>
				<SettingDescription>
					<span id={`${id}-description`}>
						Applies to new inbox questions and follow-ups. Retries keep their
						original level.
					</span>
				</SettingDescription>
				{error && (
					<>
						<SettingError>{error}</SettingError>
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
				<SettingSelect
					id={id}
					aria-describedby={`${id}-description`}
					value={reasoning}
					disabled={pending}
					onChange={(event) => void save(event.target.value)}
				>
					{THINKING_LEVELS.map((value) => (
						<option key={value} value={value}>
							{EFFORT_LABELS[value].label}
						</option>
					))}
				</SettingSelect>
			</SettingControl>
		</SettingItem>
	);
}
