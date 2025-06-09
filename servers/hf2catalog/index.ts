import { McpServer } from "npm:@modelcontextprotocol/sdk@1.6.1/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.6.1/server/stdio.js";
import { z } from "npm:zod@3.24.2";
import { hf2catalog } from "./hf2catalog.ts";

const server = new McpServer({
  name: "hf2catalog",
  version: "1.0.0",
  capabilities: {
    tools: {},
    logging: {},
  },
});

server.tool(
  "convert-hf-model-to-catalog",
  "Convert a Hugging Face model repository to a ModelCatalog YAML or JSON configuration",
  {
    repoUrl: z
      .string()
      .describe(
        "The Hugging Face model repository URL (e.g., https://huggingface.co/microsoft/DialoGPT-medium)"
      ),
    output: z
      .enum(["json", "yaml"])
      .default("yaml")
      .describe("Output format for the catalog configuration"),
  },
  async ({ repoUrl, output = "yaml" }) => {
    try {
      const catalogContent = await hf2catalog({ repoUrl, output });

      return {
        content: [
          {
            type: "text",
            text: `Generated ModelCatalog configuration in ${output.toUpperCase()} format:\n\n${catalogContent}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HF2Catalog MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  Deno.exit(1);
});
