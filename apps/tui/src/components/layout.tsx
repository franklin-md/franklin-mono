import React, { useEffect, useState } from 'react';
import { Box, useStdout } from 'ink';

interface Props {
	sidebar: React.ReactNode;
	main: React.ReactNode;
	statusBar: React.ReactNode;
}

export function Layout({ sidebar, main, statusBar }: Props): React.ReactNode {
	const { stdout } = useStdout();
	const [height, setHeight] = useState(stdout.rows);

	useEffect(() => {
		const onResize = () => setHeight(stdout.rows);
		stdout.on('resize', onResize);
		return () => {
			stdout.off('resize', onResize);
		};
	}, [stdout]);

	return (
		<Box flexDirection="column" height={height}>
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
