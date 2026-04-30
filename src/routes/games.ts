import { Router } from "express";
import {
  getAllGames,
  getGameById,
} from "../controllers/gamesController.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { connectDatabase } from "../middleware/connectDatabase.js";

const router = Router();

router.use(connectDatabase);

router.get("/games", asyncHandler(getAllGames));
router.get("/game/:id", asyncHandler(getGameById));

export default router;
