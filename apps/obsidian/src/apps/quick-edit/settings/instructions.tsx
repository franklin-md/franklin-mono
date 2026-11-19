import { useId, useState } from 'react';
import { Button } from '@franklin/ui';
import { SettingDescription } from '../../../shared/ui/setting/description.js';
import { SettingInfo } from '../../../shared/ui/setting/info.js';
import { SettingItem } from '../../../shared/ui/setting/item.js';
import { SettingName } from '../../../shared/ui/setting/name.js';
import { SettingTextarea } from '../../../shared/ui/setting/textarea.js';
import type { QuickEditSettings } from '../types.js';

type Props = {
	initial: string;
	pending: boolean;
	onSave: (update: Partial<QuickEditSettings>) => Promise<void>;
};

export function QuickEditInstructionsSetting({
	initial,
	pending,
	onSave,
}: Props) {
	const id = useId();
	const [instructions, setInstructions] = useState(initial);
	return (
		<SettingItem layout="stacked">
			<SettingInfo>
				<SettingName htmlFor={id}>Editing instructions</SettingName>
				<SettingDescription>
					Describe your outline and writing conventions. You can name
					instruction files for the agent to read.
				</SettingDescription>
			</SettingInfo>
			<form
				className="grid gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					void onSave({ instructions });
				}}
			>
				<SettingTextarea
					id={id}
					rows={4}
					value={instructions}
					disabled={pending}
					onChange={(event) => setInstructions(event.target.value)}
				/>
				<div>
					<Button type="submit" size="sm" disabled={pending}>
						Save editing instructions
					</Button>
				</div>
			</form>
		</SettingItem>
	);
}
