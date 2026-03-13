import React, { useEffect, useRef } from 'react';
import { Box, useInput } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';

import type { AgentStore } from '../../lib/agent-store.js';
import { useAgentStore } from '../../hooks/use-agent-store.js';
import { useInput as useTextInput } from '../../hooks/use-input.js';
import { useMouseScroll } from '../../hooks/use-mouse-scroll.js';
import { InputBar } from './input-bar.js';
import { MessageList } from './message-list.js';
import { PermissionPrompt } from './permission-prompt.js';

interface Props {
	store: AgentStore;
}

export function ConversationView({ store }: Props): React.ReactNode {
	const { items, pendingPermission, status } = useAgentStore(store);
	const { text, setText, submit } = useTextInput(store);
	const isDisabled = status === 'disposed';
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
			{pendingPermission ? (
				<PermissionPrompt pending={pendingPermission} store={store} />
			) : null}
			<InputBar
				value={text}
				onChange={setText}
				onSubmit={submit}
				disabled={isDisabled}
			/>
		</Box>
	);
}
