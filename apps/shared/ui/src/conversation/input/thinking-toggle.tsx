import { useThinkingLevel } from '@franklin/react';
import { ThinkingControl } from './thinking/control.js';

export function ThinkingToggle() {
	const { level, levels, setLevel } = useThinkingLevel();
	return (
		<ThinkingControl
			level={level}
			levels={levels}
			onChange={(level) => {
				void setLevel(level);
			}}
		/>
	);
}
