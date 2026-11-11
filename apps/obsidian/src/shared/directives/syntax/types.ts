export type DirectiveReference = {
	name: string;
	id: string;
};

export type DirectiveToken = DirectiveReference & {
	from: number;
	to: number;
};
