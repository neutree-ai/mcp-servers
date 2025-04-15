import "jsr:@std/dotenv@0.225.3/load";
import { Client } from "npm:@modelcontextprotocol/sdk@1.6.1/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "npm:@modelcontextprotocol/sdk@1.6.1/client/stdio.js";
import { CoreMessage, generateText } from "npm:ai@4.3.3";
import {
  CallToolResultSchema,
  CreateMessageRequestSchema,
  LoggingMessageNotificationSchema,
  PromptMessage,
  Resource,
} from "npm:@modelcontextprotocol/sdk@1.6.1/types.js";
import { google } from "npm:@ai-sdk/google@1.2.9";
import path from "node:path";
import { ENABLE_SAMPLING } from "../llm.ts";

const gemini_2_0 = google("gemini-2.0-flash");
const gemini_2_5 = google("gemini-2.5-pro-exp-03-25");

const __dirname = new URL(".", import.meta.url).pathname;

function transformMessages(messages: PromptMessage[]): CoreMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: [
      {
        type: m.content.type as "text",
        text: m.content.text as string,
      },
    ],
  }));
}

const transport = new StdioClientTransport({
  command: "deno",
  args: ["run", "-A", path.resolve(__dirname, "../index.ts")],
  env: {
    ...getDefaultEnvironment(),
    NEUTREE_CODE_BASE: Deno.env.get("NEUTREE_CODE_BASE") || "",
  },
});

const client = new Client(
  {
    name: "test",
    version: "1.0.0",
  },
  {
    capabilities: ENABLE_SAMPLING
      ? {
          sampling: {},
        }
      : {},
  }
);

client.setNotificationHandler(LoggingMessageNotificationSchema, () => {});

client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  const { messages, maxTokens, systemPrompt, temperature, modelPreferences } =
    request.params;

  const model =
    (modelPreferences?.intelligencePriority ?? 0) >
    (modelPreferences?.costPriority ?? 0)
      ? gemini_2_5
      : gemini_2_0;

  const fullMessages = transformMessages(messages);
  if (systemPrompt) {
    fullMessages.unshift({
      role: "system",
      content: systemPrompt,
    });
  }

  const { text } = await generateText({
    messages: fullMessages,
    maxTokens: maxTokens,
    model,
    temperature,
  });

  return {
    content: {
      type: "text",
      text,
    },
    model: model.modelId,
    role: "assistant",
  };
});

await client.connect(transport);

// console.log(
//   (
//     (
//       await client.callTool({
//         name: "generate-resource-type-file",
//         arguments: {
//           sqlSchema: `CREATE TYPE api.workspace_status AS (
//     phase TEXT,
//     service_url TEXT,
//     error_message TEXT
// );

// CREATE TABLE api.workspaces (
//     id SERIAL PRIMARY KEY,
//     api_version TEXT NOT NULL,
//     kind TEXT NOT NULL,
//     metadata api.metadata,
//     status api.workspace_status
// );`,
//           stateMachine: `stateDiagram-v2
//     [*] --> PENDING
//     PENDING --> CREATED
//     CREATED --> DELETED
//     DELETED --> [*]`,
//         },
//       })
//     ).content as any
//   )[0].resource
// );

// console.log(
//   (
//     (
//       await client.callTool({
//         name: "generate-storage-interface-file",
//         arguments: {
//           resource_name: "workspace",
//         },
//       })
//     ).content as any
//   )[0].resource.text
// );

// console.log(
//   (
//     (
//       await client.callTool({
//         name: "generate-storage-impl-file",
//         arguments: {
//           resource_name: "workspace",
//         },
//       })
//     ).content as any
//   )[0].resource.text
// );

const result = (
  await client.callTool(
    {
      name: "generate-controller",
      arguments: {
        createBranch: false,
        sqlSchema: `CREATE TYPE api.workspace_status AS (
  phase TEXT,
  service_url TEXT,
  error_message TEXT
);

CREATE TABLE api.workspaces (
  id SERIAL PRIMARY KEY,
  api_version TEXT NOT NULL,
  kind TEXT NOT NULL,
  metadata api.metadata,
  status api.workspace_status
);`,
        stateMachine: `stateDiagram-v2
  [*] --> PENDING
  PENDING --> CREATED
  CREATED --> RUNNING
  RUNNING --> DELETED
  DELETED --> [*]`,
      },
    },
    CallToolResultSchema,
    {
      timeout: 300_000,
    }
  )
).content as Array<{
  type: "resource";
  resource: Resource;
}>;

for (const item of result) {
  console.log(item);
}

await client.close();
