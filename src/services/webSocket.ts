import WebSocket from "ws";
import logger from "node-color-log";
import { GeminiService } from "./gemini";
import { TextToSpeechService } from "./tts";
import {
  EnhancedGenerateContentResponse,
  GenerateContentStreamResult,
  Part,
} from "@google/generative-ai";
import TextToImageService from "./textToImage";
import { TagsEnum } from "./prompts";

export class WebSocketService {
  private readonly ws: WebSocket;
  private geminiService: GeminiService;
  private textToSpeechService: TextToSpeechService;
  private textToImageService: TextToImageService;

  constructor(
    ws: WebSocket,
    geminiService: GeminiService,
    textToSpeechService: TextToSpeechService,
    textToImageService: TextToImageService
  ) {
    this.ws = ws;
    this.geminiService = geminiService;
    this.textToSpeechService = textToSpeechService;
    this.textToImageService = textToImageService;
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
        await this.handleStreamedResponse(result);
      } catch (error: any) {
        logger.color("red").log(`Error processing message: ${error.message}`);
        this.sendToFrontend({ error: error.message });
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

  private async handleStreamedResponse(result: GenerateContentStreamResult) {
    try {
      for await (const chunk of result.stream) {
        const textContent = chunk.text();
        logger.color("white").log(`Gemini: ${textContent}`);
        const audioBuffer = await this.textToSpeechService.synthesizeSpeech(
          textContent
        );
        this.sendToFrontend({
          text: textContent,
          audio: audioBuffer.toString("base64"),
        });
      }

      // Handle the aggregated response to generate the image
      const aggregatedResponse = await result.response;
      this.generateImageFromResponse(aggregatedResponse);
    } catch (error: any) {
      logger
        .color("red")
        .log(`Error in handleStreamedResponse: ${error.message}`);
    }
  }

  private async generateImageFromResponse(
    aggregatedResponse: EnhancedGenerateContentResponse
  ) {
    try {
      const textContent = aggregatedResponse.text();
      const textPromptTag = TagsEnum.ImagePrompt;

      if (textContent.includes(textPromptTag)) {
        const [, prompt] = textContent.split(textPromptTag);
        const imageUrl = await this.textToImageService.generateImage(
          prompt.trim()
        );
        this.sendToFrontend({ imageUrl });
      }
    } catch (error: any) {
      logger.color("red").log(`Error generating image: ${error.message}`);
      this.sendToFrontend({ error: "Failed to generate image" });
    }
  }

  private sendToFrontend(data: any) {
    const jsonData = JSON.stringify(data);
    this.ws.send(jsonData);
  }
}
