import dotenv from "dotenv";
import logger from "node-color-log";
import express from "express";
import helloWorldRouter from "./routes/helloWorld";
import cors from "cors";
import { GeminiService } from "./services/gemini";

dotenv.config();

class Server {
  private app: express.Application;
  private port: number;
  private geminiService: GeminiService;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));
    this.port = 3000;
    this.geminiService = new GeminiService();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use("/api", helloWorldRouter);
  }

  public start() {
    this.app.listen(this.port, () => {
      logger
        .color("blue")
        .log(`Server is running on http://localhost:${this.port}`);
    });
  }
}

const server = new Server();
server.start();
