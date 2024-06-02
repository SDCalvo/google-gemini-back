import { OpenAI } from "openai";

class TextToImageService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      const imageUrl = response.data[0].url;
      return imageUrl || "";
    } catch (error) {
      console.error("Error generating image:", error);
      throw new Error("Failed to generate image");
    }
  }
}

export default TextToImageService;
