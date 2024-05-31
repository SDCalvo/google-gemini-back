import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

export enum GeminiModels {
  //For multimodal requests:
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  //For text only requests:
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  // For text embeddings:
  TEXT_EMBEDDINGS = "text-embedding-004",
}

export class GeminiService {
  private readonly client: GoogleGenerativeAI;
  private readonly models: Record<GeminiModels, GenerativeModel> = {} as Record<
    GeminiModels,
    GenerativeModel
  >;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    for (const model of Object.values(GeminiModels)) {
      this.models[model] = this.client.getGenerativeModel({ model });
    }
  }

  public async generateText(prompt: string) {
    const result = await this.models[
      GeminiModels.GEMINI_1_5_FLASH
    ].generateContent(prompt);
    const response = result.response.text();

    return response;
  }
}
