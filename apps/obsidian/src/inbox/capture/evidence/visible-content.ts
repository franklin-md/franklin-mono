import type { AssistantContent } from '@franklin/mini-acp';

export function visibleContent(content: readonly AssistantContent[]) {
	return content.map((part) => {
		if (part.type === 'thinking')
			return { type: part.type, omitted: 'Reasoning content not retained' };
		if (part.type === 'image')
			return {
				type: part.type,
				mimeType: part.mimeType,
				omitted: 'Binary content not retained',
			};
		return part;
	});
}
