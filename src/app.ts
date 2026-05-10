import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import { requestLogger } from "./middleware/requestLogger.js";
import {
  createErrorResponse,
  errorHandler,
} from "./utils/errorHandler.js";
import gamesRouter from "./routes/games.js";
import wordleRouter from "./routes/wordle.js";
import spotifyRouter from "./routes/spotify.js";
import watcherRouter from "./routes/watcher.js";

const app = express();

const corsOrigins = process.env.CORS_ORIGINS ?? "*";

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(requestLogger);

app.use("/api", gamesRouter);
app.use("/api", wordleRouter);
app.use("/api", spotifyRouter);
app.use("/api", watcherRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "bored-backend",
    endpoints: {
      wordleDictionary: "GET /api/wordle-dictionary",
      allGames: "GET /api/games",
      gameById: "GET /api/game/:id",
      spotifyMyTopArtists:
        "GET /api/spotify/me/top/artists?time_range=short_term|medium_term|long_term&limit=1..50&offset=0..49",
      spotifyMyTopTracks:
        "GET /api/spotify/me/top/tracks?time_range=short_term|medium_term|long_term&limit=1..50&offset=0..49",
      watcherCreateSession: "POST /api/watcher/sessions",
      watcherJoinSession: "POST /api/watcher/sessions/:code/join",
      watcherSessionState: "GET /api/watcher/sessions/:id",
      watcherSessionEntries:
        "PUT|GET /api/watcher/sessions/:id/entries",
      watcherSessionReady: "POST /api/watcher/sessions/:id/ready",
      watcherSessionSwipes: "POST /api/watcher/sessions/:id/swipes",
      watcherSessionMatches: "GET /api/watcher/sessions/:id/matches",
      watcherSessionRematch: "POST /api/watcher/sessions/:id/rematch",
    },
  });
});

app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json(
      createErrorResponse(
        `Route ${req.method} ${req.originalUrl} not found`,
        "NOT_FOUND",
      ),
    );
});

app.use(errorHandler);

export default app;
