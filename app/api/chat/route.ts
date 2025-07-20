import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1).max(10000),
    })
  ).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate the request body
    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request format", details: validation.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = validation.data;

    const result = streamText({
      model: openai.responses("gpt-4o"),
      messages,
      tools: {
        web_search_preview: openai.tools.webSearchPreview(),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
