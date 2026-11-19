import { useId, useState } from 'react';
import { Button } from '@franklin/ui';
import type { InboxSettings } from '../controller/types.js';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';
import { SettingTextarea } from '../../../shared/ui/setting/textarea.js';

type Props = {
	initial: string;
	pending: boolean;
	onSave: (update: Partial<InboxSettings>) => Promise<void>;
};

export function InboxInstructionsSetting({ initial, pending, onSave }: Props) {
	const id = useId();
	const [instructions, setInstructions] = useState(initial);
	function reset() {
		setInstructions(DEFAULT_ANSWER_INSTRUCTIONS);
		void onSave({ answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS });
	}
	return (
		<SettingItem layout="stacked">
			<SettingInfo>
				<SettingName htmlFor={id}>Answer instructions</SettingName>
				<SettingDescription>
					Write how the inbox should answer. Saved instructions apply to new
					questions and follow-ups. Retries keep their original instructions.
				</SettingDescription>
			</SettingInfo>
			<form
				className="grid gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					void onSave({ answerInstructions: instructions });
				}}
			>
				<SettingTextarea
					id={id}
					value={instructions}
					rows={5}
					disabled={pending}
					onChange={(event) => setInstructions(event.target.value)}
				/>
				<div className="flex flex-wrap gap-2">
					<Button type="submit" size="sm" disabled={pending}>
						Save instructions
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={pending}
						onClick={reset}
					>
						Reset to default
					</Button>
				</div>
			</form>
		</SettingItem>
	);
}
