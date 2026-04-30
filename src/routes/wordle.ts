import { Router } from "express";
import { getWordleDictionary } from "../controllers/wordleController.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { connectDatabase } from "../middleware/connectDatabase.js";

const router = Router();

router.use(connectDatabase);

router.get("/wordle-dictionary", asyncHandler(getWordleDictionary));

export default router;
