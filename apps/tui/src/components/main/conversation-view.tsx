import React, { useEffect, useRef } from 'react';
import { Box, useInput } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import { useTranscript } from '@franklin/react-agents';

import { useInput as useTextInput } from '../../hooks/use-input.js';
import { useMouseScroll } from '../../hooks/use-mouse-scroll.js';
import { projectTranscript } from '../../lib/project-transcript.js';
import type { TuiSession } from '../../lib/tui-session.js';
import { InputBar } from './input-bar.js';
import { MessageList } from './message-list.js';

interface Props {
	session: TuiSession;
}

export function ConversationView({ session }: Props): React.ReactNode {
	const transcript = useTranscript(session);
	const items = projectTranscript(transcript, {
		isRunning: session.status === 'running',
	});
	const { text, setText, submit } = useTextInput(session);
	const isDisabled = session.status === 'disposed';
	const scrollRef = useRef<ScrollViewRef>(null);
	useMouseScroll(scrollRef);

	// Auto-scroll to bottom when new messages arrive or content changes
	useEffect(() => {
		scrollRef.current?.scrollToBottom();
	}, [items]);

	// Keyboard scroll: Shift+Up/Down to scroll, PageUp/PageDown for larger jumps
	useInput((_input, key) => {
		const ref = scrollRef.current;
		if (!ref) return;
		if (key.upArrow && key.shift) {
			ref.scrollBy(-1);
		} else if (key.downArrow && key.shift) {
			ref.scrollTo(Math.min(ref.getScrollOffset() + 1, ref.getBottomOffset()));
		} else if (key.pageUp) {
			ref.scrollBy(-10);
		} else if (key.pageDown) {
			ref.scrollTo(Math.min(ref.getScrollOffset() + 10, ref.getBottomOffset()));
		}
	});

	// Re-measure on terminal resize
	useEffect(() => {
		const onResize = () => scrollRef.current?.remeasure();
		process.stdout.on('resize', onResize);
		return () => {
			process.stdout.off('resize', onResize);
		};
	}, []);

	return (
		<Box flexDirection="column" flexGrow={1}>
			<ScrollView ref={scrollRef} flexGrow={1} flexDirection="column">
				<MessageList items={items} />
			</ScrollView>
			<InputBar
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={isDisabled}
			/>
		</Box>
	);
}
