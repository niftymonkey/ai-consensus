import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const runtime = "nodejs";

/**
 * POST /api/chat - Stream responses from all three AI models
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { prompt, models } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response("Missing or invalid prompt", { status: 400 });
    }

    // Default models if not provided
    const selectedModels = {
      claude: models?.claude || "claude-3-5-haiku-20241022",
      gpt: models?.gpt || "gpt-5-chat-latest",
      gemini: models?.gemini || "gemini-2.5-flash-lite",
    };

    // Get user's API keys
    const keys = await getApiKeys(session.user.id);

    if (!keys.anthropic && !keys.openai && !keys.google) {
      return new Response(
        JSON.stringify({
          error: "No API keys configured. Please add at least one API key in Settings."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Create a ReadableStream that merges all three model streams
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const promises: Promise<void>[] = [];

        // Helper function to stream from a model
        async function streamModel(
          modelName: string,
          apiKey: string | null,
          getStream: () => ReturnType<typeof streamText>
        ) {
          if (!apiKey) {
            const message = JSON.stringify({
              model: modelName,
              type: "error",
              content: "API key not configured",
            }) + "\n";
            controller.enqueue(encoder.encode(message));
            return;
          }

          try {
            const result = getStream();

            // Send start event
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  model: modelName,
                  type: "start",
                }) + "\n"
              )
            );

            // Stream the text chunks
            for await (const chunk of result.textStream) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    model: modelName,
                    type: "chunk",
                    content: chunk,
                  }) + "\n"
                )
              );
            }

            // Send complete event
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  model: modelName,
                  type: "complete",
                }) + "\n"
              )
            );
          } catch (error: any) {
            console.error(`Error streaming from ${modelName}:`, error);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  model: modelName,
                  type: "error",
                  content: error.message || "An error occurred",
                }) + "\n"
              )
            );
          }
        }

        // Start all three models in parallel
        if (keys.anthropic) {
          const anthropicProvider = createAnthropic({
            apiKey: keys.anthropic,
          });
          promises.push(
            streamModel("claude", keys.anthropic, () =>
              streamText({
                model: anthropicProvider(selectedModels.claude),
                prompt,
              })
            )
          );
        }

        if (keys.openai) {
          const openaiProvider = createOpenAI({
            apiKey: keys.openai,
          });
          promises.push(
            streamModel("gpt", keys.openai, () =>
              streamText({
                model: openaiProvider(selectedModels.gpt),
                prompt,
              })
            )
          );
        }

        if (keys.google) {
          const googleProvider = createGoogleGenerativeAI({
            apiKey: keys.google,
          });
          promises.push(
            streamModel("gemini", keys.google, () =>
              streamText({
                model: googleProvider(selectedModels.gemini),
                prompt,
              })
            )
          );
        }

        // Wait for all streams to complete
        await Promise.all(promises);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
