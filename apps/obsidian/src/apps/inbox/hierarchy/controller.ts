import type { Store } from '@franklin/agent';
import type { InboxSnapshot } from '../controller/types.js';
import { createGroup } from './create.js';
import { childParent } from './parent.js';
import { nextNodeOrder } from './order.js';
import type { GroupInput } from './types.js';

type Options = {
	store: Store<InboxSnapshot>;
	assertOpen: () => void;
	persist: () => Promise<void>;
	pump: () => void;
};

export class InboxGroups {
	constructor(private readonly options: Options) {}

	async add(input: GroupInput = {}, parentId?: string): Promise<string> {
		const { store, assertOpen, persist } = this.options;
		assertOpen();
		const group = createGroup(input, childParent(store.get(), parentId));
		group.order = nextNodeOrder(store.get());
		store.set((draft) => {
			(draft.groups ??= []).unshift(group);
		});
		await persist();
		this.options.pump();
		return group.id;
	}

	async fold(id: string, folded: boolean): Promise<void> {
		const { store, assertOpen, persist } = this.options;
		assertOpen();
		if (!store.get().groups?.some((group) => group.id === id))
			throw new Error('Group is no longer in the inbox');
		store.set((draft) => {
			const group = draft.groups?.find((group) => group.id === id);
			if (group) group.folded = folded;
		});
		await persist();
		this.options.pump();
	}
}
