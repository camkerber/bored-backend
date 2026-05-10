import { Request, Response } from "express";
import { z } from "zod";
import {createSuccessResponse, HttpError} from "../utils/errorHandler.js";
import {
  cleanupExpiredSessions,
  createSession,
  getDeck,
  getMatches,
  getSessionState,
  joinSession,
  markReady,
  putEntries,
  rematch,
  submitSwipes,
} from "../services/watcherService.js";
import { ParticipantContext } from "../middleware/participantToken.js";

const movieShowSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  service: z.string().max(100).optional(),
});

const createSessionSchema = z.object({
  mode: z.enum(["solo-entry", "dual-entry"]),
});

const joinParamsSchema = z.object({
  code: z.string().regex(/^\d{5}$/, "Code must be a 5-digit string"),
});

const entriesSchema = z.object({
  entries: z.array(movieShowSchema).min(1).max(10),
});

const swipesSchema = z.object({
  likes: z.array(z.string().min(1)).max(20),
  dislikes: z.array(z.string().min(1)).max(20),
});

const rematchSchema = z.object({
  mode: z.enum(["narrow", "retry"]),
});

function requireParticipant(req: Request): ParticipantContext {
  if (!req.participant) {
    throw new HttpError(
      401,
      "MISSING_PARTICIPANT_CONTEXT",
      "Participant context not attached to request",
    );
  }
  return req.participant;
}

export async function postCreateSession(
  req: Request,
  res: Response,
): Promise<void> {
  const { mode } = createSessionSchema.parse(req.body);
  const result = await createSession(mode);
  res.status(201).json(createSuccessResponse(result));
}

export async function postJoinSession(
  req: Request,
  res: Response,
): Promise<void> {
  const { code } = joinParamsSchema.parse(req.params);
  const result = await joinSession(code);
  res.json(createSuccessResponse(result));
}

export async function getSession(req: Request, res: Response): Promise<void> {
  const { sessionId } = requireParticipant(req);
  const state = await getSessionState(sessionId);
  res.json(createSuccessResponse(state));
}

export async function putSessionEntries(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const { entries } = entriesSchema.parse(req.body);
  const state = await putEntries(
    ctx.sessionId,
    ctx.slot,
    entries,
    ctx.session.mode,
  );
  res.json(createSuccessResponse(state));
}

export async function postSessionReady(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const state = await markReady(ctx.sessionId, ctx.slot);
  res.json(createSuccessResponse(state));
}

export async function getSessionEntries(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const deck = await getDeck(ctx.sessionId);
  res.json(createSuccessResponse({ entries: deck }));
}

export async function postSessionSwipes(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const { likes, dislikes } = swipesSchema.parse(req.body);
  const state = await submitSwipes(ctx.sessionId, ctx.slot, likes, dislikes);
  res.json(createSuccessResponse(state));
}

export async function getSessionMatches(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const matches = await getMatches(ctx.sessionId);
  res.json(createSuccessResponse({ matches }));
}

export async function postSessionRematch(
  req: Request,
  res: Response,
): Promise<void> {
  const ctx = requireParticipant(req);
  const { mode } = rematchSchema.parse(req.body);
  const state = await rematch(ctx.sessionId, mode);
  res.json(createSuccessResponse(state));
}

export async function getCronCleanup(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await cleanupExpiredSessions();
  res.json(createSuccessResponse(result));
}
