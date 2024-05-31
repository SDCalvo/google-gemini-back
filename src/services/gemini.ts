import {
  ChatSession,
  GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import logger from "node-color-log";

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

  public async generateChatResponse(sessionId: number, prompt: string) {
    try {
      if (!this.chatSession || !this.chatSession[sessionId]) {
        return "Chat session not found";
      }
      const result = await this.chatSession[sessionId].sendMessageStream(
        prompt
      );
      return result;
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
