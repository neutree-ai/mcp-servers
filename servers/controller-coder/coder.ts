import { z } from "npm:zod@3.24.2";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.6.1";
import {
  GENERATE_RESOURCE_TYPE_FILE,
  GENERATE_STORAGE_INTERFACE,
  GENERATE_STORAGE_IMPL,
  GENERATE_CONTROLLER,
} from "./system-prompts.ts";
import { parseYamlMessage } from "./parser.ts";
import { LLM } from "./llm.ts";

const GenerateResourceTypeSchema = z.object({
  go_type: z.string(),
  resource_name: z.string(),
});

export const generateResourceType = async (
  llm: LLM,
  {
    sqlSchema,
    stateMachine,
  }: {
    sqlSchema: string;
    stateMachine: string;
  }
) => {
  const generateResourceTypeResult = await llm.createMessage({
    systemPrompt: GENERATE_RESOURCE_TYPE_FILE,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `<input_sql_schema>${sqlSchema}</input_sql_schema>
<input_state_machine>${stateMachine}</input_state_machine>
`,
        },
      },
    ],
    maxTokens: 32768,
  });

  const { go_type, resource_name } = GenerateResourceTypeSchema.parse(
    parseYamlMessage(generateResourceTypeResult)
  );

  return {
    go_type,
    resource_name,
  };
};

const GenerateStorageInterfaceSchema = z.object({
  storage_interface_full: z.string(),
});

export const generateStorageInterface = async (
  llm: LLM,
  {
    resource_name,
    current_storage_interface,
  }: { resource_name: string; current_storage_interface: string }
) => {
  const generateStorageInterfaceResult = await llm.createMessage({
    systemPrompt: GENERATE_STORAGE_INTERFACE,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `<input_resource_name>${resource_name}</input_resource_name>
<input_storage_interface>${current_storage_interface}</input_storage_interface>`,
        },
      },
    ],
    maxTokens: 32768,
  });

  const { storage_interface_full } = GenerateStorageInterfaceSchema.parse(
    parseYamlMessage(generateStorageInterfaceResult)
  );

  return {
    storage_interface_full,
  };
};

const GenerateStorageImplSchema = z.object({
  storage_impl_full: z.string(),
});

export const generateStorageImpl = async (
  llm: LLM,
  {
    resource_name,
    current_storage_impl,
  }: { resource_name: string; current_storage_impl: string }
) => {
  const generateStorageImplResult = await llm.createMessage({
    systemPrompt: GENERATE_STORAGE_IMPL,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `<input_resource_name>${resource_name}</input_resource_name>
<input_storage_impl${current_storage_impl}</input_storage_impl`,
        },
      },
    ],
    maxTokens: 32768,
    modelPreferences: {
      intelligencePriority: 1,
    },
  });

  const { storage_impl_full } = GenerateStorageImplSchema.parse(
    parseYamlMessage(generateStorageImplResult)
  );

  return {
    storage_impl_full,
  };
};

const GenerateControllerSchema = z.object({
  controller_go_impl: z.string(),
  controller_go_test: z.string(),
});

export const generateController = async (
  llm: LLM,
  {
    sqlSchema,
    stateMachine,
    currentStorageInterface,
    currentStorageImpl,
  }: {
    sqlSchema: string;
    stateMachine: string;
    currentStorageInterface: string;
    currentStorageImpl: string;
  }
) => {
  const { resource_name, go_type } = await generateResourceType(llm, {
    sqlSchema,
    stateMachine,
  });

  const { storage_interface_full } = await generateStorageInterface(llm, {
    resource_name,
    current_storage_interface: currentStorageInterface,
  });

  const { storage_impl_full } = await generateStorageImpl(llm, {
    resource_name,
    current_storage_impl: currentStorageImpl,
  });

  const generateControllerResult = await llm.createMessage({
    systemPrompt: GENERATE_CONTROLLER,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `<input_resource_name>${resource_name}</input_resource_name>
<input_state_machine${stateMachine}</input_state_machine
<input_resource_type>${go_type}</input_resource_type>
<input_storage_interface>${storage_interface_full}</input_storage_interface>
<input_storage_impl>${storage_impl_full}</input_storage_impl>`,
        },
      },
    ],
    maxTokens: 32768,
  });

  const { controller_go_impl, controller_go_test } =
    GenerateControllerSchema.parse(parseYamlMessage(generateControllerResult));

  return {
    controller_go_impl,
    controller_go_test,
    resource_name,
    go_type,
    storage_impl_full,
    storage_interface_full,
  };
};
