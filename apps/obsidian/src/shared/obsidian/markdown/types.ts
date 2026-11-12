export type MarkdownEdit = {
	from: number;
	to: number;
	text: string;
};

export type MarkdownEditPlan = (source: string) => readonly MarkdownEdit[];
