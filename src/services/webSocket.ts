import WebSocket from "ws";
import logger from "node-color-log";
import { GeminiService } from "./gemini";

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
      if (!this.geminiService.chatSession[sessionId]) {
        this.geminiService.startChatSession(sessionId);
      }
      const result = await this.geminiService.generateChatResponse(
        sessionId,
        message
      );
      this.sendStreamedResponse(result);
    });

    this.ws.on("close", () => {
      logger.color("white").log("WebSocket connection closed");
    });

    this.ws.on("error", (error) => {
      logger.color("red").log(`WebSocket error: ${error}`);
    });
  }

  private async sendStreamedResponse(result: any) {
    for await (const chunk of result.stream) {
      // Ensure the chunk is in a format that can be sent via WebSocket
      const dataToSend =
        typeof chunk === "string" ? chunk : JSON.stringify(chunk);
      try {
        const parsedData = JSON.parse(dataToSend);
        if (parsedData?.candidates[0]?.content?.parts) {
          const parts = parsedData.candidates[0].content.parts;
          for (const part of parts) {
            this.ws.send(part.text);
          }
        }
      } catch (error) {
        logger.color("red").log(`Error parsing or sending data: ${error}`);
      }
    }
  }
}
