import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { createErrorResponse } from "../utils/errorHandler.js";
import { getCollection } from "../config/database.js";
import { ParticipantSlot, WatcherSessionDoc } from "../types/watcher.js";

export interface ParticipantContext {
  sessionId: string;
  session: WatcherSessionDoc;
  slot: ParticipantSlot;
}

declare module "express-serve-static-core" {
  interface Request {
    participant?: ParticipantContext;
  }
}

export async function participantToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.header("x-participant-token");
    if (!token) {
      res
        .status(401)
        .json(
          createErrorResponse(
            "Missing participant token",
            "MISSING_PARTICIPANT_TOKEN",
          ),
        );
      return;
    }

    const id = req.params.id;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res
        .status(400)
        .json(createErrorResponse("Invalid session id", "INVALID_SESSION_ID"));
      return;
    }

    const collection = getCollection<WatcherSessionDoc>("watcher_sessions");
    const session = await collection.findOne({ _id: new ObjectId(id) });
    if (!session) {
      res
        .status(404)
        .json(createErrorResponse("Session not found", "SESSION_NOT_FOUND"));
      return;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      res
        .status(410)
        .json(createErrorResponse("Session expired", "SESSION_EXPIRED"));
      return;
    }

    let slot: ParticipantSlot | undefined;
    if (session.participants.p1.token === token) slot = "p1";
    else if (session.participants.p2.token === token) slot = "p2";

    if (!slot) {
      res
        .status(403)
        .json(
          createErrorResponse(
            "Invalid participant token for this session",
            "INVALID_PARTICIPANT_TOKEN",
          ),
        );
      return;
    }

    req.participant = { sessionId: id, session, slot };
    next();
  } catch (err) {
    next(err);
  }
}
