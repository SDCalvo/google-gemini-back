import WebSocket from "ws";
import logger from "node-color-log";
import { GeminiService } from "./gemini";
import { Part } from "@google/generative-ai"; // Import Part type

export class WebSocketService {
  private readonly ws: WebSocket;
  private geminiService: GeminiService;

  constructor(ws: WebSocket, geminiService: GeminiService) {
    this.ws = ws;
    this.geminiService = geminiService;
    this.setupListeners();
  }

  private setupListeners() {
    this.ws.on("message", async (message: string) => {
      logger.color("blue").log(`Received message: ${message}`);
      const sessionId = 1; // Assume a single session for simplicity, adjust as needed

      // Parse the incoming message to determine if it's text or an image
      const parts: Part[] = this.parseMessage(message);

      if (!this.geminiService.chatSession[sessionId]) {
        this.geminiService.startChatSession(sessionId);
      }

      try {
        const result = await this.geminiService.generateChatResponseStreamed(
          sessionId,
          parts
        );
        await this.sendStreamedResponse(result);
      } catch (error: any) {
        logger.color("red").log(`Error processing message: ${error.message}`);
        this.ws.send(JSON.stringify({ error: error.message }));
      }
    });

    this.ws.on("close", () => {
      logger.color("white").log("WebSocket connection closed");
    });

    this.ws.on("error", (error) => {
      logger.color("red").log(`WebSocket error: ${error}`);
    });
  }

  private parseMessage(message: string): Part[] {
    try {
      const parsed = JSON.parse(message);

      // Check if parsed is an array
      if (!Array.isArray(parsed)) {
        throw new Error("Expected an array of parts");
      }

      // Create an array to hold parts
      const parts: Part[] = [];

      // Iterate over each item in the parsed array
      parsed.forEach((item) => {
        if (item.text) {
          parts.push({ text: item.text });
        } else if (item.inlineData) {
          if (!item.inlineData.mimeType || !item.inlineData.data) {
            throw new Error("Invalid image message format");
          }
          parts.push({
            inlineData: {
              mimeType: item.inlineData.mimeType,
              data: item.inlineData.data,
            },
          });
        } else {
          throw new Error("Unknown part type");
        }
      });

      return parts;
    } catch (error: any) {
      logger.color("red").log(`Error parsing message: ${error.message}`);
      throw error;
    }
  }

  private async sendStreamedResponse(result: any) {
    try {
      if (!result || !result.stream) {
        throw new Error("Invalid response from Gemini API");
      }

      for await (const chunk of result.stream) {
        const dataToSend =
          typeof chunk === "string" ? chunk : JSON.stringify(chunk);
        try {
          const parsedData = JSON.parse(dataToSend);
          logger
            .color("blue")
            .log(`Parsed data: ${JSON.stringify(parsedData)}`);
          if (
            parsedData.candidates &&
            parsedData.candidates[0] &&
            parsedData.candidates[0].content &&
            parsedData.candidates[0].content.parts
          ) {
            const parts = parsedData.candidates[0].content.parts;
            for (const part of parts) {
              if (part.text) {
                this.ws.send(part.text);
              } else if (part.inlineData) {
                this.ws.send(part.inlineData.data); // Base64 encoded image
              }
            }
          } else {
            logger
              .color("red")
              .log(`Invalid response format: ${JSON.stringify(parsedData)}`);
          }
        } catch (error) {
          logger.color("red").log(`Error parsing or sending data: ${error}`);
        }
      }
    } catch (error: any) {
      logger
        .color("red")
        .log(`Error in sendStreamedResponse: ${error.message}`);
    }
  }
}
