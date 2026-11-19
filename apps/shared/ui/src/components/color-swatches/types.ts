export type ColorOption = {
	id: string;
	label: string;
	// Complete text-color utilities. Swatches draw with `currentColor`.
	colorClassName: string;
};

export type ColorSwatchesProps = {
	options: readonly ColorOption[];
	value: string;
	onChange: (id: string) => void;
	label?: string;
};
