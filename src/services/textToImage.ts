import { OpenAI } from "openai";
import { imageStylePromptSufix } from "./prompts";

class TextToImageService {
  private openai: OpenAI;
  private imageHistory: string[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async generateImage(prompt: string): Promise<string> {
    try {
      const promptWithSufix = prompt + imageStylePromptSufix;
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: promptWithSufix,
        n: 1,
        size: "1024x1024",
      });
      const imageUrl = response.data[0].url;
      if (imageUrl) this.imageHistory.push(imageUrl);
      return imageUrl || "";
    } catch (error) {
      console.error("Error generating image:", error);
      throw new Error("Failed to generate image");
    }
  }

  public getImageHistory() {
    return this.imageHistory;
  }
}

export default TextToImageService;
