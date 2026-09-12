import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./errors/AppError.js";

export function createApp() {
  const app = express();

  const allowedOrigins = [
    config.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS not allowed for this origin"));
        }
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API routes
  app.use("/api/v1", routes);

  // 404 handler for unmapped endpoints
  app.use((_req, _res, next) => {
    next(AppError.notFound("Endpoint not found"));
  });

  // Global structured error handler
  app.use(errorHandler);

  return app;
}
