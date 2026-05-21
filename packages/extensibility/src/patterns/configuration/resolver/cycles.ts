import {
	ConfigurationCycleError,
	type ConfigurationCycleEntry,
	configurationCycleEntry,
} from '../cycle-error.js';
import type { ConfigurationProvider } from '../configuration.js';
import type { ConfigurationContribution } from '../contribution.js';

type NodeId = ConfigurationProvider<any, any>;

type GraphNodeRef = {
	readonly id: NodeId;
	readonly label: string;
};

type GraphNode = GraphNodeRef & {
	readonly edges: GraphNodeRef[];
};

type VisitState = 'visiting' | 'visited';

function graphRefForConfiguration(
	entry: ConfigurationCycleEntry,
): GraphNodeRef {
	return {
		id: entry.provider,
		label: entry.name,
	};
}

function cycleEntryForGraphRef(ref: GraphNodeRef): ConfigurationCycleEntry {
	return {
		provider: ref.id,
		name: ref.label,
	};
}

function getOrCreateGraphNode(
	graph: Map<NodeId, GraphNode>,
	ref: GraphNodeRef,
): GraphNode {
	const existing = graph.get(ref.id);
	if (existing !== undefined) return existing;

	const node = {
		...ref,
		edges: [],
	};
	graph.set(ref.id, node);
	return node;
}

function buildDeclaredDependencyGraph(
	contributions: readonly ConfigurationContribution[],
): Map<NodeId, GraphNode> {
	const graph = new Map<NodeId, GraphNode>();

	for (const contribution of contributions) {
		const node = getOrCreateGraphNode(
			graph,
			graphRefForConfiguration(configurationCycleEntry(contribution.provider)),
		);
		if (contribution.kind === 'static') continue;

		for (const dependency of contribution.dependencies) {
			const edge = graphRefForConfiguration(
				configurationCycleEntry(dependency),
			);
			getOrCreateGraphNode(graph, edge);
			node.edges.push(edge);
		}
	}

	return graph;
}

function findCycle(
	node: GraphNode,
	graph: ReadonlyMap<NodeId, GraphNode>,
	states: Map<NodeId, VisitState>,
	path: readonly GraphNodeRef[],
): readonly GraphNodeRef[] | undefined {
	states.set(node.id, 'visiting');
	const nextPath = [...path, node];

	for (const edge of node.edges) {
		const edgeState = states.get(edge.id);
		if (edgeState === 'visiting') {
			const cycleStart = nextPath.findIndex((entry) => entry.id === edge.id);
			return [...nextPath.slice(cycleStart), edge];
		}

		if (edgeState === 'visited') continue;

		const nextNode = graph.get(edge.id);
		if (nextNode === undefined) continue;

		const cycle = findCycle(nextNode, graph, states, nextPath);
		if (cycle !== undefined) return cycle;
	}

	states.set(node.id, 'visited');
	return undefined;
}

export function assertNoDeclaredConfigurationCycles(
	contributions: readonly ConfigurationContribution[],
): void {
	const graph = buildDeclaredDependencyGraph(contributions);
	const states = new Map<NodeId, VisitState>();

	for (const node of graph.values()) {
		if (states.has(node.id)) continue;

		const cycle = findCycle(node, graph, states, []);
		if (cycle !== undefined) {
			throw new ConfigurationCycleError(cycle.map(cycleEntryForGraphRef));
		}
	}
}
