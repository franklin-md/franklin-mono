export function ancestorsOf<T extends { id: string; parentId?: string }>(
	node: T,
	nodes: T[],
): T[] {
	const chain: T[] = [];
	const visited = new Set([node.id]);
	let id = node.parentId;
	while (id) {
		if (visited.has(id)) throw new Error('Inbox lineage contains a cycle');
		visited.add(id);
		const parent = nodes.find((item) => item.id === id);
		if (!parent) throw new Error('Parent node is missing');
		chain.unshift(parent);
		id = parent.parentId;
	}
	return chain;
}
