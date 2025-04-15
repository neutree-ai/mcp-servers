import { McpServer } from "npm:@modelcontextprotocol/sdk@1.6.1";
import { PromptMessage } from "npm:@modelcontextprotocol/sdk@1.6.1";
import { google } from "npm:@ai-sdk/google@1.2.9";
import { CoreMessage, generateText } from "npm:ai@4.3.3";

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

export const ENABLE_SAMPLING = Deno.env.get("ENABLE_SAMPLING") === "true";

export class LLM {
  server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  async createMessage(payload: {
    systemPrompt?: string;
    messages: PromptMessage[];
    maxTokens?: number;
    modelPreferences?: {
      intelligencePriority?: number;
    };
  }) {
    if (ENABLE_SAMPLING) {
      const result = await this.server.server.createMessage(payload);
      return result.content.text as string;
    }

    const gemini_2_0 = google("gemini-2.0-flash");
    const gemini_2_5 = google("gemini-2.5-pro-exp-03-25");

    const { messages, systemPrompt } = payload;
    const transformedMessages = transformMessages(messages);

    const { text } = await generateText({
      system: systemPrompt,
      messages: transformedMessages,
      model:
        payload.modelPreferences?.intelligencePriority === 1
          ? gemini_2_5
          : gemini_2_0,
      maxTokens: payload.maxTokens,
      maxRetries: 5,
    });

    return text;
  }
}
