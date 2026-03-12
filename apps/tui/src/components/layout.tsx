import React from 'react';
import { Box } from 'ink';

interface Props {
	sidebar: React.ReactNode;
	main: React.ReactNode;
	statusBar: React.ReactNode;
}

export function Layout({ sidebar, main, statusBar }: Props): React.ReactNode {
	return (
		<Box flexDirection="column" height="100%">
			<Box flexDirection="row" flexGrow={1}>
				<Box
					flexDirection="column"
					width={24}
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
					overflow="hidden"
				>
					{sidebar}
				</Box>
				<Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
					{main}
				</Box>
			</Box>
			{statusBar}
		</Box>
	);
}
