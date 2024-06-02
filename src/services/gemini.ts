import {
  ChatSession,
  GenerativeModel,
  GoogleGenerativeAI,
  Part,
} from "@google/generative-ai";
import logger from "node-color-log";
import { systemPrompt } from "./prompts";

export enum GeminiModels {
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  TEXT_EMBEDDINGS = "text-embedding-004",
}

export class GeminiService {
  private readonly client: GoogleGenerativeAI;
  private readonly models: Record<GeminiModels, GenerativeModel> = {} as Record<
    GeminiModels,
    GenerativeModel
  >;
  public chatSession: Record<number, ChatSession> = {} as Record<
    number,
    ChatSession
  >;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    for (const model of Object.values(GeminiModels)) {
      this.models[model] = this.client.getGenerativeModel({ model });
    }
  }

  public async generateText(prompt: string) {
    try {
      const result = await this.models[
        GeminiModels.GEMINI_1_5_FLASH
      ].generateContent(prompt);
      const response = result.response.text();
      return response;
    } catch (e) {
      logger.color("red").log(e);
    }
  }

  public startChatSession(id: number) {
    this.chatSession[id] = this.models[GeminiModels.GEMINI_1_5_PRO].startChat();
  }

  public async generateChatResponseStreamed(sessionId: number, parts: Part[]) {
    try {
      for (const part of parts) {
        if (part.text) {
          part.text = `${systemPrompt} ${part.text}`;
        }
      }
      if (!this.chatSession || !this.chatSession[sessionId]) {
        throw new Error("Chat session not found");
      }

      logger
        .color("blue")
        .log(`Sending parts to Gemini: ${JSON.stringify(parts)}`);
      const result = await this.chatSession[sessionId].sendMessageStream(parts);

      if (!result || !result.stream) {
        throw new Error("Invalid response from Gemini API");
      }

      return result;
    } catch (e: any) {
      logger
        .color("red")
        .log(`Error in generateChatResponseStreamed: ${e.message}`);
      throw e; // Rethrow the error to be handled by the caller
    }
  }

  public async generateChatResponse(sessionId: number, prompt: string) {
    try {
      if (!this.chatSession || !this.chatSession[sessionId]) {
        return "Chat session not found";
      }
      const result = await this.chatSession[sessionId].sendMessage(prompt);
      return result.response.text();
    } catch (e) {
      logger.color("red").log(e);
    }
  }

  public async getChatHistory(sessionId: number) {
    try {
      if (!this.chatSession || !this.chatSession[sessionId]) {
        return "Chat session not found";
      }
      const result = await this.chatSession[sessionId].getHistory();
      return result;
    } catch (e) {
      logger.color("red").log(e);
    }
  }
}
