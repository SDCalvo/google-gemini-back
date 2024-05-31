import dotenv from "dotenv";
import logger from "node-color-log";
import express from "express";
import helloWorldRouter from "./routes/helloWorld";
import cors from "cors";
import { GeminiService } from "./services/gemini";
import expressWs from "express-ws";
import { WebSocketService } from "./services/webSocket";
import WebSocket from "ws";

dotenv.config();

class Server {
  private app: expressWs.Application;
  private port: number;
  private geminiService: GeminiService;

  constructor() {
    this.app = expressWs(express()).app;
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));
    this.port = 3000;
    this.geminiService = new GeminiService();
    this.setupRoutes();
    this.setupWebsocket();
  }

  private setupRoutes() {
    this.app.use("/api", helloWorldRouter);
  }

  private setupWebsocket() {
    this.app.ws("/api/audio-ws", (ws: WebSocket, _: express.Request) => {
      logger.color("green").log("WebSocket connection opened");
      new WebSocketService(ws, this.geminiService);
    });
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
