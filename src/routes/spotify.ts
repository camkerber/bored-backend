import { Router } from "express";
import {
  getMyTopArtists,
  getMyTopTracks,
} from "../controllers/spotifyController.js";
import { asyncHandler } from "../utils/errorHandler.js";

const router = Router();

router.get("/spotify/me/top/artists", asyncHandler(getMyTopArtists));
router.get("/spotify/me/top/tracks", asyncHandler(getMyTopTracks));

export default router;
