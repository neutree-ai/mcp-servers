import { parse } from "jsr:@std/yaml@1.0.5";

export function parseYamlMessage(input: string) {
  // Regular expression to match YAML code blocks
  const yamlCodeBlocks = /```yaml\n([\s\S]*?)\n```/g;

  // Find all matches for YAML code blocks
  const matches = Array.from(input.matchAll(yamlCodeBlocks));

  if (matches.length > 1) {
    throw new Error("Multiple YAML code blocks found in the input string.");
  }

  let yamlString: string;

  if (matches.length === 1) {
    // Extract YAML content from the code block, trimming whitespace
    yamlString = matches[0][1].trim();
  } else {
    // No YAML code block found, use the entire input
    yamlString = input.trim();
  }

  try {
    // Parse the YAML string into an object
    return parse(yamlString);
  } catch (error) {
    throw new Error("Failed to parse YAML: " + error + "\n\n" + yamlString);
  }
}
