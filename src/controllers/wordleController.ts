import { Request, Response } from "express";
import { getCollection } from "../config/database.js";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../utils/errorHandler.js";
import { WordleDictionary } from "../types/wordle.js";

export async function getWordleDictionary(
  _req: Request,
  res: Response,
): Promise<void> {
  const collection = getCollection("wordle");
  const doc = await collection.findOne({});
  if (!doc) {
    res
      .status(404)
      .json(
        createErrorResponse("Wordle dictionary not found", "WORDLE_NOT_FOUND"),
      );
    return;
  }
  const { _id, ...dictionary } = doc;
  res.json(createSuccessResponse(dictionary as WordleDictionary));
}
