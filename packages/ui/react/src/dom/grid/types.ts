import type {
	FocusEventHandler,
	KeyboardEvent,
	KeyboardEventHandler,
	Ref,
	RefCallback,
} from 'react';

export type GridKey = Pick<
	KeyboardEvent,
	'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>;

// The cell each move reaches from one cell, in row-major order.
export type GridPosition = {
	left: number;
	right: number;
	up: number;
	down: number;
	rowStart: number;
	rowEnd: number;
	first: number;
	last: number;
};

export type UseGridNavigationOptions<T extends HTMLElement = HTMLDivElement> = {
	count: number;
	columns: number;
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
	ref?: Ref<T>;
};

export type GridHandlers<T extends HTMLElement> = {
	onKeyDown?: KeyboardEventHandler<T>;
	onFocus?: FocusEventHandler<T>;
};

export type GridProps<T extends HTMLElement> = {
	ref: RefCallback<T>;
	role: 'grid';
	onKeyDown: KeyboardEventHandler<T>;
	onFocus: FocusEventHandler<T>;
};

export type GridRowProps = {
	role: 'row';
};

export type GridCellProps = {
	role: 'gridcell';
	tabIndex: 0 | -1;
};

export type GridNavigation<T extends HTMLElement> = {
	activeIndex: number;
	getGridProps: (handlers?: GridHandlers<T>) => GridProps<T>;
	getRowProps: () => GridRowProps;
	getCellProps: (index: number) => GridCellProps;
	focusCell: (index: number) => void;
};
