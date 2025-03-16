import { z } from "zod";

// Word schema - match exactly with the original app
export const wordSchema = z.object({
  thought: z.string().default(""),
  parts: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        originalWord: z.string(),
        origin: z.string().default("Unknown"),
        meaning: z.string().default(""),
      })
    )
    .default([]),
  combinations: z
    .array(
      z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            definition: z.string().default(""),
            sourceIds: z.array(z.string()).default([]),
          })
        )
        .default([])
    )
    .default([]),
});

export type WordOutput = z.infer<typeof wordSchema>;

// Validation functions
export function validateWordParts(
  word: string,
  parts: WordOutput["parts"]
): string[] {
  const errors: string[] = [];
  const combinedParts = parts.map((p) => p.text).join("");
  const commaSeparatedParts = parts.map((p) => p.text).join(", ");

  if (combinedParts.toLowerCase() !== word.toLowerCase().replaceAll(" ", "")) {
    errors.push(
      `The parts "${commaSeparatedParts}" do not combine to form the word "${word}"`
    );
  }
  return errors;
}

export function validateUniqueIds(output: WordOutput): string[] {
  const errors: string[] = [];
  const seenIds = new Map<string, string>(); // id -> where it was found

  // Check parts
  output.parts.forEach((part) => {
    seenIds.set(part.id, "parts");
  });

  // Check combinations
  output.combinations.forEach((layer, layerIndex) => {
    layer.forEach((combo) => {
      if (seenIds.has(combo.id)) {
        errors.push(
          `ID "${combo.id}" in combinations layer ${
            layerIndex + 1
          } is already used in ${seenIds.get(
            combo.id
          )}. IDs must be unique across both parts and combinations.`
        );
      }
      seenIds.set(combo.id, `combinations layer ${layerIndex + 1}`);
    });
  });

  return errors;
}

export function validateCombinations(
  word: string,
  output: WordOutput
): string[] {
  const errors: string[] = [];

  // Check if last layer has exactly one item
  const lastLayer = output.combinations[output.combinations.length - 1];
  if (lastLayer?.length !== 1) {
    errors.push(
      `The last layer should have exactly one item, which should be the original word, but you have ${
        lastLayer?.length || 0
      } items.`
    );
  }

  // Check if last combination is the full word
  if (lastLayer?.length === 1) {
    const finalWord = lastLayer[0].text.toLowerCase();
    if (finalWord !== word.toLowerCase()) {
      errors.push(
        `The final combination "${finalWord}" does not match the input word "${word}"`
      );
    }
  }

  // Check dependencies
  if (output.combinations && output.combinations.length > 0) {
    // Build a map of how many times each ID is used as a source
    const childCount = new Map<string, number>();

    // Initialize counts for all parts
    output.parts.forEach((part) => {
      childCount.set(part.id, 0);
    });

    // Count how many times each ID is used as a source
    output.combinations.forEach((layer) => {
      layer.forEach((combo) => {
        combo.sourceIds.forEach((sourceId) => {
          const count = childCount.get(sourceId) ?? 0;
          childCount.set(sourceId, count + 1);
        });
        // Initialize count for this combination
        childCount.set(combo.id, 0);
      });
    });

    // Validate DAG structure
    const allIds = new Set(output.parts.map((p) => p.id));
    for (let i = 0; i < output.combinations.length; i++) {
      const layer = output.combinations[i];
      // Add combination IDs from this layer
      layer.forEach((combo) => allIds.add(combo.id));

      // Check if all sourceIds exist in previous layers
      for (const combo of layer) {
        for (const sourceId of combo.sourceIds) {
          if (!allIds.has(sourceId)) {
            errors.push(
              `The sourceId "${sourceId}" in combination "${combo.id}" does not exist in previous layers.`
            );
          }
        }
      }
    }
  }

  return errors;
}

// Comprehensive validation
export function validateWordDefinition(
  word: string,
  output: WordOutput
): string[] {
  return [
    ...validateWordParts(word, output.parts),
    ...validateUniqueIds(output),
    ...validateCombinations(word, output),
  ];
}
