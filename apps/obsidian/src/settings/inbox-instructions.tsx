import { useId, useState } from 'react';
import { Button, Label } from '@franklin/ui';
import type { InboxController } from '../inbox/controller/controller.js';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../inbox/answer-instructions.js';
import { errorMessage } from '../inbox/controller/error.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

type Props = { inbox: InboxController };

export function InboxInstructionsSetting({ inbox }: Props) {
	const id = useId();
	const [instructions, setInstructions] = useState(
		() => inbox.state.get().preferences.answerInstructions,
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();

	async function save(answerInstructions: string) {
		setPending(true);
		setError(undefined);
		try {
			await inbox.configure({ answerInstructions });
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
					<Label htmlFor={id}>Answer instructions</Label>
				</SettingName>
				<SettingDescription>
					Write how the inbox should answer. Saved instructions apply to new
					questions and follow-ups. Retries keep their original instructions.
				</SettingDescription>
				<form
					className="mt-3 grid gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void save(instructions);
					}}
				>
					<textarea
						className="w-full resize-y"
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
							onClick={() => {
								setInstructions(DEFAULT_ANSWER_INSTRUCTIONS);
								void save(DEFAULT_ANSWER_INSTRUCTIONS);
							}}
						>
							Reset to default
						</Button>
					</div>
					{error && (
						<p role="alert" className="text-[var(--text-error)]">
							{error}
						</p>
					)}
				</form>
			</SettingInfo>
		</SettingItem>
	);
}
