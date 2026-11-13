import {
	Expand,
	FlaskConical,
	Scissors,
	ListTree,
	Sparkles,
	Pencil,
	MessageCircle,
	Languages,
	Link,
} from 'lucide-react';

export const presetIcons = {
	link: { label: 'Link', icon: Link },
	expand: { label: 'Expand', icon: Expand },
	flask: { label: 'Example', icon: FlaskConical },
	scissors: { label: 'Scissors', icon: Scissors },
	'list-tree': { label: 'Outline', icon: ListTree },
	sparkles: { label: 'Sparkles', icon: Sparkles },
	pencil: { label: 'Pencil', icon: Pencil },
	'message-circle': { label: 'Comment', icon: MessageCircle },
	languages: { label: 'Languages', icon: Languages },
} as const;
