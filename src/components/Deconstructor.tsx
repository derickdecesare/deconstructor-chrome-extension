import React, { useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Edge,
  Handle,
  type Node,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { atom, useAtom } from "jotai";
import { WordOutput } from "@/utils/schema";
import {
  fetchWordDefinition,
  defaultDefinition as apiDefaultDefinition,
} from "@/utils/api";

// Simple warning suppression for React Flow edge errors
const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  // Skip React Flow edge warnings
  if (
    typeof args[0] === "string" &&
    args[0].includes("[React Flow]: Couldn't create edge for source handle")
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Loading state atom
const isLoadingAtom = atom(false);

// Add errorAtom to share errors with ContentScriptApp
const errorAtom = atom<string | null>(null);

// Constants for layout
const verticalSpacing = 100;
const wordChunkPadding = 20;
const originPadding = 40;

// Node components
const WordChunkNode = ({ data }: { data: { text: string } }) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-center transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div style={{ display: "inline-block", textAlign: "center" }}>
        <div className="text-5xl font-serif mb-1">{data.text}</div>
        <div
          className="h-3 border border-t-0 border-white"
          style={{ width: "100%" }}
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const OriginNode = ({
  data,
}: {
  data: { originalWord: string; origin: string; meaning: string };
}) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-stretch transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="px-2 py-1.5 rounded-md bg-gray-800 border border-gray-700/50 min-w-fit max-w-[150px]">
        <div className="flex flex-col items-start">
          <p className="text-sm font-serif mb-0.5 whitespace-nowrap">
            {data.originalWord}
          </p>
          <p className="text-xs text-gray-400 w-full leading-tight">
            {data.origin}
          </p>
          <p className="text-xs text-gray-300 w-full leading-tight">
            {data.meaning}
          </p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const CombinedNode = ({
  data,
}: {
  data: { text: string; definition: string };
}) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-stretch transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="px-2 py-1.5 rounded-md bg-gray-800 border border-gray-700/50 min-w-fit max-w-[200px]">
        <div className="flex flex-col items-start">
          <p className="text-base font-serif mb-0.5 whitespace-nowrap">
            {data.text}
          </p>
          <p className="text-xs text-gray-300 w-full leading-tight">
            {data.definition}
          </p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

// Node types mapping
const nodeTypes = {
  wordChunk: WordChunkNode,
  origin: OriginNode,
  combined: CombinedNode,
};

// Layout function
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const newNodes: Node[] = [];

  // Increase vertical spacing to prevent overlap
  const verticalPadding = 100;
  let nextY = 0;

  // Position original word at the top
  const originalWordNode = nodes.find((node) => node.id === "original-word");
  if (originalWordNode) {
    newNodes.push({
      ...originalWordNode,
      position: { x: 0, y: nextY },
    });
    nextY += verticalPadding - 40; // Less spacing after the original word
  }

  // Set up spacing for word chunks with minimal horizontal padding
  const horizontalPadding = 20;
  let totalWordChunkWidth = 0;
  nodes.forEach((node) => {
    if (node.type === "wordChunk") {
      totalWordChunkWidth += (node.width ?? 100) + horizontalPadding;
    }
  });

  // Position word chunks - very tight horizontal spacing
  let lastWordChunkX = 0;
  nodes.forEach((node) => {
    if (node.type === "wordChunk") {
      newNodes.push({
        ...node,
        position: {
          x: -totalWordChunkWidth / 2 + lastWordChunkX,
          y: nextY,
        },
      });
      lastWordChunkX += (node.width ?? 100) + horizontalPadding;
    }
  });

  nextY += verticalPadding;

  // Add more space before origins
  nextY += 20;

  // Position origins with minimal padding
  const originHorizontalPadding = 8; // Reduced from 15
  let totalOriginWidth = 0;
  nodes.forEach((node) => {
    if (node.type === "origin") {
      totalOriginWidth += (node.width ?? 150) + originHorizontalPadding;
    }
  });

  let lastOriginX = 0;
  nodes.forEach((node) => {
    if (node.type === "origin") {
      newNodes.push({
        ...node,
        position: {
          x: -totalOriginWidth / 2 + lastOriginX,
          y: nextY,
        },
      });
      lastOriginX += (node.width ?? 150) + originHorizontalPadding;
    }
  });

  nextY += verticalPadding;

  // Add more space before combinations
  nextY += 20;

  // Position combinations by layer
  const combinationsByY = new Map<number, Node[]>();
  nodes.forEach((node) => {
    if (node.type === "combined") {
      const layer = Math.floor(node.position.y / verticalSpacing);
      if (!combinationsByY.has(layer)) {
        combinationsByY.set(layer, []);
      }
      combinationsByY.get(layer)!.push(node);
    }
  });

  // Layout each layer of combinations with minimal spacing
  const combinedHorizontalPadding = 8; // Reduced from 15
  const sortedLayers = Array.from(combinationsByY.keys()).sort((a, b) => a - b);
  sortedLayers.forEach((layer) => {
    const layerNodes = combinationsByY.get(layer)!;
    let totalWidth = 0;
    layerNodes.forEach((node) => {
      totalWidth += (node.width ?? 200) + combinedHorizontalPadding;
    });

    let lastX = 0;
    layerNodes.forEach((node) => {
      newNodes.push({
        ...node,
        position: {
          x: -totalWidth / 2 + lastX,
          y: nextY,
        },
      });
      lastX += (node.width ?? 200) + combinedHorizontalPadding;
    });
    nextY += verticalPadding;

    // Add extra space between combination layers
    nextY += 20;
  });

  return { nodes: newNodes, edges };
}

// Function to create initial nodes from a definition
const createInitialNodes = (word: string, definition: WordOutput) => {
  if (!definition) return { nodes: [], edges: [] };

  let nodes: Node[] = [];
  let edges: Edge[] = [];

  // Safeguard against empty definition parts
  if (!definition.parts || definition.parts.length === 0) {
    // Create a fallback node for words with no etymology data
    nodes.push({
      id: "no-data",
      type: "wordChunk",
      position: { x: 0, y: 0 },
      data: { text: "No etymological data available" },
      width: 300,
    });
    return { nodes, edges };
  }

  // Add word parts and their origins
  definition.parts.forEach((part) => {
    // Word chunk node
    nodes.push({
      id: part.id,
      type: "wordChunk",
      position: { x: 0, y: 0 },
      data: { text: part.text },
      width: Math.max(part.text.length * 25, 100),
    });

    // Origin node
    const originId = `origin-${part.id}`;
    nodes.push({
      id: originId,
      type: "origin",
      position: { x: 0, y: 0 },
      data: {
        originalWord: part.originalWord,
        origin: part.origin,
        meaning: part.meaning,
      },
      width: 110,
    });

    // Connect word part to origin with explicit handles
    edges.push({
      id: `edge-${part.id}-${originId}`,
      source: part.id,
      target: originId,
      type: "straight",
      style: { stroke: "#4B5563", strokeWidth: 1 },
      animated: true,
    });
  });

  // Only process combinations if they exist
  if (definition.combinations && definition.combinations.length > 0) {
    // Add combinations layer by layer
    definition.combinations.forEach((layer, layerIndex) => {
      if (!layer || layer.length === 0) return;

      const y = (layerIndex + 2) * verticalSpacing;

      layer.forEach((combination) => {
        // Add combination node
        nodes.push({
          id: combination.id,
          type: "combined",
          position: { x: 0, y },
          data: {
            text: combination.text,
            definition: combination.definition,
          },
          width: 160,
        });

        // Add edges from all sources
        if (combination.sourceIds && combination.sourceIds.length > 0) {
          combination.sourceIds.forEach((sourceId) => {
            if (!sourceId) return;

            // If source is a word part, connect from its origin node
            const isPart = definition.parts.find((p) => p.id === sourceId);
            const actualSourceId = isPart ? `origin-${sourceId}` : sourceId;

            // Check if source node exists
            const sourceExists = nodes.some(
              (node) => node.id === actualSourceId
            );
            if (!sourceExists) return;

            edges.push({
              id: `edge-${actualSourceId}-${combination.id}`,
              source: actualSourceId,
              target: combination.id,
              type: "straight",
              style: { stroke: "#4B5563", strokeWidth: 1 },
              animated: true,
            });
          });
        }
      });
    });
  }

  // Simple log of created nodes and edges
  console.log(
    `Created ${nodes.length} nodes and ${edges.length} edges for word: ${word}`
  );

  // console.log(`Nodes: ${JSON.stringify(nodes)}`);
  // console.log(`Edges: ${JSON.stringify(edges)}`);

  return { nodes, edges };
};

interface DeconstructorProps {
  word: string;
  apiKey: string;
  model?: string;
}

const Deconstructor: React.FC<DeconstructorProps> = ({
  word,
  apiKey,
  model = "gpt-4o",
}) => {
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [definition, setDefinition] = useState<WordOutput | null>(null);
  const { fitView } = useReactFlow();
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!word) return;

    async function fetchData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setError(null);

        const data = await fetchWordDefinition(word, apiKey, retryCount, model);
        console.log(`API response for "${word}":`, data);
        setDefinition(data);
      } catch (err) {
        console.error("Error fetching word definition:", err);
        setErrorMessage(
          `Failed to analyze the word. Please try again or check your API key.`
        );
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [word, apiKey, setError, retryCount, model]);

  // Use fallback to default only if no error occurred
  const effectiveDefinition =
    definition || (!error ? apiDefaultDefinition : null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      effectiveDefinition
        ? createInitialNodes(word, effectiveDefinition)
        : { nodes: [], edges: [] },
    [effectiveDefinition, word]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    if (nodesInitialized && nodes.length > 0) {
      console.log(`Applying layout to ${nodes.length} nodes`);
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setTimeout(() => {
        fitView({ duration: 300, padding: 0.3, includeHiddenNodes: false });
      }, 50);
    }
  }, [nodesInitialized, fitView, nodes.length]);

  return (
    <div className="h-[450px] bg-gray-900 text-gray-100">
      {effectiveDefinition && nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          className="bg-gray-900"
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.35, minZoom: 0.3, maxZoom: 1.5 }}
          minZoom={0.2}
          maxZoom={3}
          defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
        >
          <Background color="#333" />
        </ReactFlow>
      ) : !isLoading && error ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <p className="text-red-400 mb-4">Could not analyze this word.</p>
          <p className="text-gray-300 mb-6">{error.replace("Error: ", "")}</p>
          <button
            onClick={() => {
              setRetryCount((prevCount) => prevCount + 1);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

const DeconstructorWrapper: React.FC<DeconstructorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <Deconstructor {...props} />
    </ReactFlowProvider>
  );
};

export default DeconstructorWrapper;
