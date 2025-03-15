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
import { z } from "zod";

// Loading state atom
const isLoadingAtom = atom(false);

// Constants for layout
const verticalSpacing = 100;
const wordChunkPadding = 20;
const originPadding = 40;

// Word schema
const wordSchema = z.object({
  thought: z.string(),
  parts: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      originalWord: z.string(),
      origin: z.string(),
      meaning: z.string(),
    })
  ),
  combinations: z
    .array(
      z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            definition: z.string(),
            sourceIds: z.array(z.string()),
          })
        )
        .nonempty()
    )
    .nonempty(),
});

type Definition = z.infer<typeof wordSchema>;

// Default definition for testing
const defaultDefinition: Definition = {
  thought: "",
  parts: [
    {
      id: "de",
      text: "de",
      originalWord: "de-",
      origin: "Latin",
      meaning: "down, off, away",
    },
    {
      id: "construc",
      text: "construc",
      originalWord: "construere",
      origin: "Latin",
      meaning: "to build, to pile up",
    },
    {
      id: "tor",
      text: "tor",
      originalWord: "-or",
      origin: "Latin",
      meaning: "agent noun, one who does an action",
    },
  ],
  combinations: [
    [
      {
        id: "constructor",
        text: "constructor",
        definition: "one who constructs or builds",
        sourceIds: ["construc", "tor"],
      },
    ],
    [
      {
        id: "deconstructor",
        text: "deconstructor",
        definition:
          "one who takes apart or analyzes the construction of something",
        sourceIds: ["de", "constructor"],
      },
    ],
  ],
};

// Node components
const WordChunkNode = ({ data }: { data: { text: string } }) => {
  const [isLoading] = useAtom(isLoadingAtom);
  return (
    <div
      className={`flex flex-col items-center transition-all duration-1000 ${
        isLoading ? "opacity-0 blur-[20px]" : ""
      }`}
    >
      <div className="text-5xl font-serif mb-1">{data.text}</div>
      <div className="w-full h-3 border border-t-0 border-white" />
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
      <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700/50 min-w-fit max-w-[180px]">
        <div className="flex flex-col items-start">
          <p className="text-lg font-serif mb-1 whitespace-nowrap">
            {data.originalWord}
          </p>
          <p className="text-xs text-gray-400 w-full">{data.origin}</p>
          <p className="text-xs text-gray-300 w-full">{data.meaning}</p>
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
      <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700/50 min-w-fit max-w-[250px]">
        <div className="flex flex-col items-start">
          <p className="text-xl font-serif mb-1 whitespace-nowrap">
            {data.text}
          </p>
          <p className="text-sm text-gray-300 w-full">{data.definition}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
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

  let nextY = 0;

  // Set up spacing for word chunks
  let totalWordChunkWidth = 0;
  nodes.forEach((node) => {
    if (node.type === "wordChunk") {
      totalWordChunkWidth += (node.width ?? 100) + wordChunkPadding;
    }
  });

  // Position word chunks
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
      lastWordChunkX += (node.width ?? 100) + wordChunkPadding;
    }
  });

  nextY += verticalSpacing;

  // Position origins
  let totalOriginWidth = 0;
  nodes.forEach((node) => {
    if (node.type === "origin") {
      totalOriginWidth += (node.width ?? 150) + originPadding;
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
      lastOriginX += (node.width ?? 150) + originPadding;
    }
  });

  nextY += verticalSpacing;

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

  // Layout each layer of combinations
  const sortedLayers = Array.from(combinationsByY.keys()).sort((a, b) => a - b);
  sortedLayers.forEach((layer) => {
    const layerNodes = combinationsByY.get(layer)!;
    let totalWidth = 0;
    layerNodes.forEach((node) => {
      totalWidth += (node.width ?? 200) + originPadding;
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
      lastX += (node.width ?? 200) + originPadding;
    });
    nextY += verticalSpacing;
  });

  return { nodes: newNodes, edges };
}

// Function to create initial nodes from definition
function createInitialNodes(definition: Definition) {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // Add word parts and their origins
  definition.parts.forEach((part) => {
    // Word chunk node
    initialNodes.push({
      id: part.id,
      type: "wordChunk",
      position: { x: 0, y: 0 },
      data: { text: part.text },
      width: 100,
    });

    // Origin node
    const originId = `origin-${part.id}`;
    initialNodes.push({
      id: originId,
      type: "origin",
      position: { x: 0, y: 0 },
      data: {
        originalWord: part.originalWord,
        origin: part.origin,
        meaning: part.meaning,
      },
      width: 150,
    });

    // Connect word part to origin
    initialEdges.push({
      id: `edge-${part.id}-${originId}`,
      source: part.id,
      target: originId,
      type: "straight",
      style: { stroke: "#4B5563", strokeWidth: 1 },
      animated: true,
    });
  });

  // Add combinations layer by layer
  definition.combinations.forEach((layer, layerIndex) => {
    const y = (layerIndex + 2) * verticalSpacing;

    layer.forEach((combination) => {
      // Add combination node
      initialNodes.push({
        id: combination.id,
        type: "combined",
        position: { x: 0, y },
        data: {
          text: combination.text,
          definition: combination.definition,
        },
        width: 200,
      });

      // Add edges from all sources
      combination.sourceIds.forEach((sourceId) => {
        // If source is a word part, connect from its origin node
        const isPart = definition.parts.find((p) => p.id === sourceId);
        const actualSourceId = isPart ? `origin-${sourceId}` : sourceId;

        initialEdges.push({
          id: `edge-${actualSourceId}-${combination.id}`,
          source: actualSourceId,
          target: combination.id,
          type: "straight",
          style: { stroke: "#4B5563", strokeWidth: 1 },
          animated: true,
        });
      });
    });
  });

  return { initialNodes, initialEdges };
}

// API function to get word definition
const fetchWordDefinition = async (
  word: string,
  apiKey: string
): Promise<Definition> => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Analyze the word provided by the user and break it down into its etymological parts. 
            Return a JSON object strictly following this format:
            {
              "thought": "Your reasoning process (short)",
              "parts": [
                {
                  "id": "unique_id",
                  "text": "text_fragment",
                  "originalWord": "original_word_or_root",
                  "origin": "language_of_origin",
                  "meaning": "meaning_in_origin_language"
                }
              ],
              "combinations": [
                [
                  {
                    "id": "unique_id",
                    "text": "combined_text",
                    "definition": "definition_of_combination",
                    "sourceIds": ["id_of_part_1", "id_of_part_2"]
                  }
                ]
              ]
            }
            The "combinations" array should contain arrays of objects, with each sub-array representing a layer of word building.`,
          },
          {
            role: "user",
            content: `Analyze the word: ${word}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to analyze word");
    }

    // Extract JSON from response
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : content;

    // Parse and validate with schema
    const result = JSON.parse(jsonContent);
    return wordSchema.parse(result);
  } catch (error) {
    console.error("Error fetching word definition:", error);
    return defaultDefinition;
  }
};

interface DeconstructorProps {
  word: string;
  apiKey: string;
}

const Deconstructor: React.FC<DeconstructorProps> = ({ word, apiKey }) => {
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [definition, setDefinition] = useState<Definition>(defaultDefinition);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const fetchData = async () => {
      if (word && apiKey) {
        setIsLoading(true);
        try {
          const data = await fetchWordDefinition(word, apiKey);
          setDefinition(data);
        } catch (error) {
          console.error("Error analyzing word:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [word, apiKey]);

  const { initialNodes, initialEdges } = useMemo(
    () => createInitialNodes(definition),
    [definition]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    if (nodesInitialized) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setTimeout(() => {
        fitView({ duration: 500, padding: 0.2 });
      }, 100);
    }
  }, [nodesInitialized, fitView]);

  return (
    <div className="h-[350px] bg-gray-900 text-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        className="bg-gray-900"
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background color="#333" />
      </ReactFlow>
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
