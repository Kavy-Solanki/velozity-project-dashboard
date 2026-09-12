import http from "http";
import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./realtime/socketServer.js";
import { initOverdueCron, stopOverdueCron } from "./jobs/overdueCron.js";
import { prisma } from "./prisma.js";

const app = createApp();
const httpServer = http.createServer(app);

// Initialize WebSockets
initSocketServer(httpServer);

// Initialize background cron scheduler
initOverdueCron();

httpServer.listen(config.PORT, () => {
  console.log(`[API Server] Running on http://localhost:${config.PORT}`);
  console.log(`[API Server] API v1 base: http://localhost:${config.PORT}/api/v1`);
});

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopOverdueCron();
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
