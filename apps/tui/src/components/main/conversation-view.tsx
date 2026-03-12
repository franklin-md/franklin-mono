import React, { useEffect, useRef } from 'react';
import { Box, useInput } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';

import type { AgentHandle } from '@franklin/agent-manager';

import { useAgentHandle } from '../../hooks/use-agent-handle.js';
import { useInput as useTextInput } from '../../hooks/use-input.js';
import { useMouseScroll } from '../../hooks/use-mouse-scroll.js';
import { InputBar } from './input-bar.js';
import { MessageList } from './message-list.js';
import { PermissionPrompt } from './permission-prompt.js';

interface Props {
	handle: AgentHandle;
}

export function ConversationView({ handle }: Props): React.ReactNode {
	const { conversation, pendingPermission, status } = useAgentHandle(handle);
	const { text, setText, submit } = useTextInput(handle);
	const isDisabled = status === 'disposed' || status === 'exited';
	const scrollRef = useRef<ScrollViewRef>(null);
	useMouseScroll(scrollRef);

	// Auto-scroll to bottom when new messages arrive or content changes
	useEffect(() => {
		scrollRef.current?.scrollToBottom();
	}, [conversation]);

	// Keyboard scroll: Shift+Up/Down to scroll, PageUp/PageDown for larger jumps
	useInput((_input, key) => {
		if (key.upArrow && key.shift) {
			scrollRef.current?.scrollBy(-1);
		} else if (key.downArrow && key.shift) {
			scrollRef.current?.scrollBy(1);
		} else if (key.pageUp) {
			scrollRef.current?.scrollBy(-10);
		} else if (key.pageDown) {
			scrollRef.current?.scrollBy(10);
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
				<MessageList items={conversation} />
			</ScrollView>
			{pendingPermission ? (
				<PermissionPrompt request={pendingPermission} handle={handle} />
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
