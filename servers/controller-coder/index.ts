import "jsr:@std/dotenv@0.225.3/load";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.6.1/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.6.1/server/stdio.js";

import { z } from "npm:zod@3.24.2";
import {
  generateController,
  generateResourceType,
  generateStorageImpl,
  generateStorageInterface,
} from "./coder.ts";
import assert from "node:assert";
import path from "node:path";
import { commitToBranch } from "./shell.ts";

const NEUTREE_CODE_BASE = Deno.env.get("NEUTREE_CODE_BASE");
assert(NEUTREE_CODE_BASE, "NEUTREE_CODE_BASE environment variable is not set.");

const server = new McpServer({
  name: "controller-coder",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    logging: {},
  },
});

server.tool(
  "generate-resource-type-file",
  "Generate the type definition file for a resource",
  {
    sqlSchema: z
      .string()
      .describe(
        "The SQL schema to generate the type definition file for, usually described in a SQL code block."
      ),
    stateMachine: z
      .string()
      .describe(
        "The state transitions of the resource, usually described in a mermaid code block. If the resource has status.phase, drill down the state machine to the status.phase level."
      ),
  },
  async ({ sqlSchema, stateMachine }) => {
    const { go_type, resource_name } = await generateResourceType(server, {
      sqlSchema,
      stateMachine,
    });

    return {
      content: [
        {
          type: "resource",
          resource: {
            mimeType: "plain/text",
            text: go_type,
            uri: `file://api/v1/${resource_name}_types.go`,
          },
        },
      ],
    };
  }
);

server.tool(
  "generate-storage-interface-file",
  "Modify the current storage interface file to add the new resource interface",
  {
    resource_name: z
      .string()
      .describe(
        "The resource name in singular form, e.g. 'role' for 'roles'. The resource name is used to generate the storage interface file."
      ),
  },
  async ({ resource_name }) => {
    const current_storage_interface = await Deno.readTextFile(
      path.resolve(NEUTREE_CODE_BASE, "pkg/storage/storage.go")
    );
    const { storage_interface_full } = await generateStorageInterface(server, {
      resource_name,
      current_storage_interface: current_storage_interface,
    });

    return {
      content: [
        {
          type: "resource",
          resource: {
            mimeType: "plain/text",
            text: storage_interface_full,
            uri: `file://pkg/storage/storage.go`,
          },
        },
      ],
    };
  }
);

server.tool(
  "generate-storage-impl-file",
  "Modify the current storage impl file to add the new resource implementation",
  {
    resource_name: z
      .string()
      .describe(
        "The resource name in singular form, e.g. 'role' for 'roles'. The resource name is used to generate the storage impl file."
      ),
  },
  async ({ resource_name }) => {
    const current_storage_impl = await Deno.readTextFile(
      path.resolve(NEUTREE_CODE_BASE, "pkg/storage/postgrest.go")
    );
    const { storage_impl_full } = await generateStorageImpl(server, {
      resource_name,
      current_storage_impl,
    });

    return {
      content: [
        {
          type: "resource",
          resource: {
            mimeType: "plain/text",
            text: storage_impl_full,
            uri: `file://pkg/storage/postgrest.go`,
          },
        },
      ],
    };
  }
);

server.tool(
  "generate-controller",
  "Generate all the controller related code(including implementation and unit tests) for a resource",
  {
    sqlSchema: z
      .string()
      .describe(
        "The SQL schema to generate the type definition file for, usually described in a SQL code block."
      ),
    stateMachine: z
      .string()
      .describe(
        "The state transitions of the resource, usually described in a mermaid code block. If the resource has status.phase, drill down the state machine to the status.phase level."
      ),
    createBranch: z
      .boolean()
      .describe(
        "Whether to create a new branch for the generated code and push to origin."
      ),
  },
  async ({ sqlSchema, stateMachine, createBranch = true }) => {
    const currentStorageInterface = await Deno.readTextFile(
      path.resolve(NEUTREE_CODE_BASE, "pkg/storage/storage.go")
    );

    const currentStorageImpl = await Deno.readTextFile(
      path.resolve(NEUTREE_CODE_BASE, "pkg/storage/postgrest.go")
    );

    const {
      go_type,
      resource_name,
      storage_impl_full,
      storage_interface_full,
      controller_go_impl,
      controller_go_test,
    } = await generateController(server, {
      sqlSchema,
      stateMachine,
      currentStorageImpl,
      currentStorageInterface,
    });

    const resources = [
      {
        type: "resource" as const,
        resource: {
          mimeType: "plain/text",
          text: go_type,
          uri: `file://api/v1/${resource_name}_types.go`,
        },
      },
      {
        type: "resource" as const,
        resource: {
          mimeType: "plain/text",
          text: storage_interface_full,
          uri: `file://pkg/storage/storage.go`,
        },
      },
      {
        type: "resource" as const,
        resource: {
          mimeType: "plain/text",
          text: storage_impl_full,
          uri: `file://pkg/storage/postgrest.go`,
        },
      },
      {
        type: "resource" as const,
        resource: {
          mimeType: "plain/text",
          text: controller_go_impl,
          uri: `file://controllers/${resource_name}_controller.go`,
        },
      },
      {
        type: "resource" as const,
        resource: {
          mimeType: "plain/text",
          text: controller_go_test,
          uri: `file://controllers/${resource_name}_controller_test.go`,
        },
      },
    ];

    if (!createBranch) {
      return {
        content: resources,
      };
    }

    const { branchName } = await commitToBranch({
      resource_name,
      files: resources.map((r) => {
        return {
          path: path.resolve(
            NEUTREE_CODE_BASE,
            r.resource.uri.replace("file://", "")
          ),
          content: r.resource.text,
        };
      }),
    });

    return {
      content: [
        {
          type: "text",
          text: `The code has been generated and committed to branch ${branchName}.`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Neutree controller coder MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  Deno.exit(1);
});
