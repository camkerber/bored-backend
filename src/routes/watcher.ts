import { Router } from "express";
import { asyncHandler } from "../utils/errorHandler.js";
import { connectDatabase } from "../middleware/connectDatabase.js";
import { participantToken } from "../middleware/participantToken.js";
import {
  getSession,
  getSessionEntries,
  getSessionMatches,
  getCronCleanup,
  postCreateSession,
  postJoinSession,
  postSessionRematch,
  postSessionReady,
  postSessionSwipes,
  putSessionEntries,
} from "../controllers/watcherController.js";

const router = Router();

router.use(connectDatabase);

router.post("/watcher/sessions", asyncHandler(postCreateSession));
router.post("/watcher/sessions/:code/join", asyncHandler(postJoinSession));

router.get(
  "/watcher/sessions/:id",
  asyncHandler(participantToken),
  asyncHandler(getSession),
);
router.put(
  "/watcher/sessions/:id/entries",
  asyncHandler(participantToken),
  asyncHandler(putSessionEntries),
);
router.post(
  "/watcher/sessions/:id/ready",
  asyncHandler(participantToken),
  asyncHandler(postSessionReady),
);
router.get(
  "/watcher/sessions/:id/entries",
  asyncHandler(participantToken),
  asyncHandler(getSessionEntries),
);
router.post(
  "/watcher/sessions/:id/swipes",
  asyncHandler(participantToken),
  asyncHandler(postSessionSwipes),
);
router.get(
  "/watcher/sessions/:id/matches",
  asyncHandler(participantToken),
  asyncHandler(getSessionMatches),
);
router.post(
  "/watcher/sessions/:id/rematch",
  asyncHandler(participantToken),
  asyncHandler(postSessionRematch),
);

router.get("/watcher/cron/cleanup", asyncHandler(getCronCleanup));

export default router;
