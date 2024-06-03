import axios from "axios";
import fs from "fs";
import path from "path";
import { imageStylePromptSufix } from "./prompts";
import logger from "node-color-log";

class TextToImageService {
  private imageHistory: string[] = [];
  private readonly projectId: string;
  private readonly location: string;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly useSampleImages: boolean;
  private readonly samplesFilePath: string;

  constructor(useSampleImages: boolean = false) {
    this.projectId = process.env.GCLOUD_PROJECT as string;
    this.location = "us-central1";
    this.model = "imagegeneration@006";
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}:predict`;
    this.useSampleImages = useSampleImages;
    this.samplesFilePath = path.resolve(__dirname, "image_samples.json");
  }

  public async generateImage(prompt: string): Promise<string> {
    if (this.useSampleImages) {
      const sampleImage = this.getRandomSampleImage();
      if (sampleImage) {
        return sampleImage;
      }
    }

    try {
      const promptWithSufix = prompt + imageStylePromptSufix;

      const requestBody = {
        instances: [
          {
            prompt: promptWithSufix,
          },
        ],
        parameters: {
          sampleCount: 1,
          language: "en",
          aspectRatio: "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
        },
      };

      const response = await axios.post(this.endpoint, requestBody, {
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
          "Content-Type": "application/json",
        },
      });

      const predictions = response.data.predictions;

      if (
        predictions &&
        predictions.length > 0 &&
        predictions[0].bytesBase64Encoded
      ) {
        const base64Image = predictions[0].bytesBase64Encoded;
        this.imageHistory.push(base64Image);
        this.saveSampleImage(base64Image);
        return `data:image/png;base64,${base64Image}`;
      }

      throw new Error("No image generated");
    } catch (error) {
      logger.color("red").log("Error generating image:", error);
      throw new Error("Failed to generate image");
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { exec } = require("child_process");
      return new Promise((resolve, reject) => {
        exec(
          "gcloud auth print-access-token",
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              reject(`Error getting access token: ${stderr}`);
            }
            resolve(stdout.trim());
          }
        );
      });
    } catch (error) {
      logger.color("red").log("Error getting access token:", error);
      throw new Error("Failed to get access token");
    }
  }

  private getRandomSampleImage(): string | undefined {
    const samples = this.loadSamples();
    if (samples.length > 0) {
      const randomIndex = Math.floor(Math.random() * samples.length);
      return samples[randomIndex];
    }
    logger.color("yellow").log("No sample images found");
    return undefined;
  }

  private saveSampleImage(image: string): void {
    try {
      const samples = this.loadSamples();
      samples.push(image);
      fs.writeFileSync(this.samplesFilePath, JSON.stringify(samples, null, 2));
    } catch (error) {
      logger.color("red").log("Failed to save sample image:", error);
    }
  }

  private loadSamples(): string[] {
    try {
      if (fs.existsSync(this.samplesFilePath)) {
        const data = fs.readFileSync(this.samplesFilePath, "utf8");
        return JSON.parse(data) as string[];
      }
      return [];
    } catch (error) {
      logger.color("red").log("Failed to load samples:", error);
      return [];
    }
  }

  public getImageHistory() {
    return this.imageHistory;
  }
}

export default TextToImageService;
