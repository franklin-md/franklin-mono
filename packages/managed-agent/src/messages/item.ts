export type ItemKind = 'user_message' | 'assistant_message';

export type ItemStarted =
	| {
			kind: 'user_message';
			text: string;
	  }
	| {
			kind: 'assistant_message';
	  };

export type ItemDelta =
	| {
			kind: 'user_message';
			textDelta: string;
	  }
	| {
			kind: 'assistant_message';
			textDelta: string;
	  };

export type ItemCompleted =
	| {
			kind: 'user_message';
			text: string;
	  }
	| {
			kind: 'assistant_message';
			text: string;
	  };

export type ItemStartedEvent = {
	type: 'item.started';
	item: ItemStarted;
};

export type ItemDeltaEvent = {
	type: 'item.delta';
	item: ItemDelta;
};

export type ItemCompletedEvent = {
	type: 'item.completed';
	item: ItemCompleted;
};
