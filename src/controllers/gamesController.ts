import { Request, Response } from "express";
import { Document } from "mongodb";
import { getCollection } from "../config/database.js";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../utils/errorHandler.js";
import { Game } from "../types/index.js";

function isGame(value: unknown): value is Game {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Game).connections)
  );
}

export async function getAllGames(_req: Request, res: Response): Promise<void> {
  const collection = getCollection<Document>("camnections");
  const doc = await collection.findOne({});
  if (!doc) {
    res
      .status(404)
      .json(
        createErrorResponse("Games collection not found", "GAMES_NOT_FOUND"),
      );
    return;
  }
  const { _id, ...rest } = doc;
  const games = Object.values(rest).filter(isGame);
  res.json(createSuccessResponse(games));
}

export async function getGameById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || typeof id !== "string" || id === "_id") {
    res
      .status(400)
      .json(createErrorResponse("Invalid game id", "INVALID_GAME_ID"));
    return;
  }

  const collection = getCollection<Document>("camnections");
  const doc = await collection.findOne({}, { projection: { [id]: 1 } });
  const game = doc?.[id];
  if (!isGame(game)) {
    res
      .status(404)
      .json(createErrorResponse(`Game ${id} not found`, "GAME_NOT_FOUND"));
    return;
  }
  res.json(createSuccessResponse(game));
}
