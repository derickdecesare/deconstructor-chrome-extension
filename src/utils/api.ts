import { generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { wordSchema, validateWordDefinition, type WordOutput } from "./schema";

// Default definition as fallback
export const defaultDefinition: WordOutput = {
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

/**
 * Fetches word analysis using the AI SDK's generateObject function
 */
export async function fetchWordDefinition(
  word: string,
  apiKey: string,
  retryCount: number = 0,
  modelName: string = "gpt-4o"
): Promise<WordOutput> {
  const maxAttempts = 3;
  let attempts = 0;
  let previousResults: any[] = [];
  let lastError: any = null;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts} for word: ${word}`);

    try {
      // Build the prompt based on previous attempts
      let prompt = `Analyze the word: ${word}`;
      if (previousResults.length > 0) {
        prompt += "\n\nPrevious attempts:";
        previousResults.forEach((result, idx) => {
          prompt += `\nAttempt ${idx + 1}:\n${JSON.stringify(
            result.output,
            null,
            2
          )}\n`;
          if (result.errors?.length) {
            prompt += `Errors:\n${result.errors
              .map((e: string) => `- ${e}`)
              .join("\n")}\n`;
          }
        });
        prompt += "\nPlease fix all the issues and try again.";
      }

      // Choose model based on attempt number
      //   const modelName = attempts === 1 ? "gpt-4o-mini" : "gpt-4o";
      //   const modelName = "gpt-4o-mini";
      //   const modelName = "gpt-4o"; // just default to 4o
      //   const modelName = "gpt-4.5-preview";
      // const modelName = "o1"
      // const modelName = "o3-mini"

      const result = await generateObject({
        model: createOpenAI({ apiKey })(modelName),
        schema: wordSchema,
        schemaName: "WordEtymology",
        schemaDescription:
          "A word broken down into its etymological parts with layers of combinations",
        system: `You are a linguistic expert that deconstructs words into their meaningful parts and explains their etymology. Create multiple layers of combinations to form the final meaning of the word.

Schema Requirements:
- thought: The reasoning behind the word's etymology and how it's constructed
- parts: An array of word parts that MUST combine to form the original word
  - id: Unique identifier for the word part (simple, lowercase, no spaces)
  - text: The EXACT section of text from the original word
  - originalWord: The oldest form this part derives from
  - origin: Brief origin language (e.g., "Latin", "Greek")
  - meaning: The meaning of this part in its original language
- combinations: A directed acyclic graph showing how parts combine
  - Each array is a single layer in the graph
  - Each combination contains:
    - id: Unique identifier (cannot repeat part IDs)
    - text: The combined text
    - definition: Definition of the combined parts
    - sourceIds: Array of IDs of parts or combinations that form this
  - The last layer MUST have exactly one combination matching the full word

If the word has no clear etymology:
1. Still break it into phonetic or meaningful segments
2. Include at least one part
3. Always include at least one combination layer
4. Make sure the final combination is the original word

IMPORTANT: Ensure that:
1. Parts combine exactly to form the original word, no extra or missing letters
2. IDs are unique across all parts and combinations
3. Every node (except the final word) is used exactly once as a source
4. The final layer has exactly one node representing the full word
5. All sourceIds reference existing parts or previous combinations`,
        prompt,
      });

      //   console.log("raw result", result);

      // Validate the result
      const definition = result.object;
      const validationErrors = validateWordDefinition(word, definition);

      if (validationErrors.length > 0) {
        console.log("Validation errors:", validationErrors);
        previousResults.push({
          output: definition,
          errors: validationErrors,
        });

        // Try again if not the last attempt
        if (attempts < maxAttempts) {
          continue;
        }

        // On the last attempt, log the error but still return the result
        console.warn(
          "Returning result despite validation errors:",
          validationErrors
        );
      }

      return definition;
    } catch (error) {
      console.error(`Error in attempt ${attempts}:`, error);
      lastError = error;

      // On the last attempt
      if (attempts >= maxAttempts) {
        // For the last attempt, try to use the last result even if it had validation errors
        if (previousResults.length > 0) {
          const lastResult = previousResults[previousResults.length - 1].output;
          if (lastResult) {
            console.warn("Using last imperfect result as fallback");
            return lastResult;
          }
        }

        // If all else fails and it's the final user-initiated retry, use default
        if (retryCount > 0) {
          console.warn(
            "Falling back to default definition after all retries failed"
          );
          return defaultDefinition;
        }

        throw error;
      }
    }
  }

  // This should never happen
  throw (
    lastError || new Error("Failed to analyze word after multiple attempts")
  );
}
