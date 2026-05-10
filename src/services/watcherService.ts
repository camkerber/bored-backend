import { ObjectId, ReturnDocument } from "mongodb";
import { randomUUID } from "node:crypto";
import { getCollection } from "../config/database.js";
import { HttpError } from "../utils/errorHandler.js";
import {
  CreateSessionResult,
  JoinSessionResult,
  MovieShow,
  ParticipantSlot,
  ParticipantState,
  PublicParticipantState,
  PublicSessionState,
  SessionMode,
  SessionStatus,
  WatcherSessionDoc,
} from "../types/watcher.js";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const CODE_GENERATION_ATTEMPTS = 6;
const COLLECTION = "watcher_sessions";

const SOLO_MIN = 2;
const SOLO_MAX = 10;
const DUAL_MIN = 1;
const DUAL_MAX = 5;

class WatcherSessionError extends HttpError {
  constructor(statusCode: number, code: string, message: string) {
    super(statusCode, code, message);
    this.name = "WatcherSessionError";
  }
}

function emptyParticipant(): ParticipantState {
  return {
    entries: [],
    formReady: false,
    likes: [],
    dislikes: [],
    swipesDone: false,
  };
}

function generateCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function toPublicParticipant(p: ParticipantState): PublicParticipantState {
  return {
    present: typeof p.token === "string",
    formReady: p.formReady,
    swipesDone: p.swipesDone,
    entryCount: p.entries.length,
  };
}

export function toPublicSessionState(
  doc: WatcherSessionDoc,
): PublicSessionState {
  return {
    sessionId: doc._id.toString(),
    code: doc.code,
    mode: doc.mode,
    status: doc.status,
    rounds: doc.rounds,
    expiresAt: doc.expiresAt.toISOString(),
    participants: {
      p1: toPublicParticipant(doc.participants.p1),
      p2: toPublicParticipant(doc.participants.p2),
    },
  };
}

function deckLimits(mode: SessionMode): { min: number; max: number } {
  return mode === "solo-entry"
    ? { min: SOLO_MIN, max: SOLO_MAX }
    : { min: DUAL_MIN, max: DUAL_MAX };
}

function assertEntriesValid(entries: MovieShow[], mode: SessionMode): void {
  const { min, max } = deckLimits(mode);
  if (entries.length < min || entries.length > max) {
    throw new WatcherSessionError(
      400,
      "INVALID_ENTRY_COUNT",
      `Entries must be between ${min} and ${max} for ${mode} mode`,
    );
  }
  const ids = new Set<string>();
  for (const e of entries) {
    if (ids.has(e.id)) {
      throw new WatcherSessionError(
        400,
        "DUPLICATE_ENTRY_ID",
        `Duplicate entry id: ${e.id}`,
      );
    }
    ids.add(e.id);
  }
}

export async function createSession(
  mode: SessionMode,
): Promise<CreateSessionResult> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const token = randomUUID();

  let lastError: unknown;
  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateCode();
    const sessionId = new ObjectId();
    const doc: WatcherSessionDoc = {
      _id: sessionId,
      code,
      mode,
      status: "waiting-for-partner",
      createdAt: now,
      expiresAt,
      participants: {
        p1: { ...emptyParticipant(), token },
        p2: emptyParticipant(),
      },
      rounds: 1,
    };
    try {
      await collection.insertOne(doc);
      return { sessionId: sessionId.toString(), code, participantToken: token };
    } catch (err) {
      lastError = err;
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new WatcherSessionError(
    503,
    "CODE_GENERATION_FAILED",
    `Could not generate a unique session code after ${CODE_GENERATION_ATTEMPTS} attempts: ${String(lastError)}`,
  );
}

export async function joinSession(code: string): Promise<JoinSessionResult> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const now = new Date();
  const token = randomUUID();

  const session = await collection.findOne({ code });
  if (!session) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "No session found for that code",
    );
  }
  if (session.expiresAt.getTime() <= now.getTime()) {
    throw new WatcherSessionError(410, "SESSION_EXPIRED", "Session expired");
  }
  if (session.participants.p2.token) {
    throw new WatcherSessionError(409, "SESSION_FULL", "Session is full");
  }

  const nextStatus: SessionStatus =
    session.mode === "solo-entry" && session.participants.p1.formReady
      ? "matching"
      : "form";

  const updated = await collection.findOneAndUpdate(
    {
      _id: session._id,
      "participants.p2.token": { $exists: false },
      expiresAt: { $gt: now },
    },
    {
      $set: {
        "participants.p2.token": token,
        status: nextStatus,
      },
    },
    { returnDocument: ReturnDocument.AFTER },
  );

  if (!updated) {
    throw new WatcherSessionError(
      409,
      "SESSION_FULL",
      "Session was claimed by another participant",
    );
  }

  return {
    sessionId: updated._id.toString(),
    participantToken: token,
    state: toPublicSessionState(updated),
  };
}

export async function getSessionState(
  sessionId: string,
): Promise<PublicSessionState> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!doc) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  return toPublicSessionState(doc);
}

export async function putEntries(
  sessionId: string,
  slot: ParticipantSlot,
  entries: MovieShow[],
  mode: SessionMode,
): Promise<PublicSessionState> {
  assertEntriesValid(entries, mode);
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(sessionId) },
    {
      $set: {
        [`participants.${slot}.entries`]: entries,
      },
    },
    { returnDocument: ReturnDocument.AFTER },
  );
  if (!updated) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  return toPublicSessionState(updated);
}

function bothFormsReady(doc: WatcherSessionDoc): boolean {
  if (doc.mode === "solo-entry") {
    return doc.participants.p1.formReady && !!doc.participants.p2.token;
  }
  return doc.participants.p1.formReady && doc.participants.p2.formReady;
}

function hasRequiredEntries(p: ParticipantState, mode: SessionMode): boolean {
  const { min, max } = deckLimits(mode);
  return p.entries.length >= min && p.entries.length <= max;
}

export async function markReady(
  sessionId: string,
  slot: ParticipantSlot,
): Promise<PublicSessionState> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const session = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!session) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }

  if (session.mode === "dual-entry" || slot === "p1") {
    if (!hasRequiredEntries(session.participants[slot], session.mode)) {
      throw new WatcherSessionError(
        400,
        "ENTRIES_REQUIRED",
        "Cannot mark ready before entries are submitted",
      );
    }
  } else if (session.mode === "solo-entry" && slot === "p2") {
    throw new WatcherSessionError(
      400,
      "READY_NOT_APPLICABLE",
      "p2 does not submit entries in solo-entry mode",
    );
  }

  const updated = await collection.findOneAndUpdate(
    { _id: session._id },
    {
      $set: {
        [`participants.${slot}.formReady`]: true,
      },
    },
    { returnDocument: ReturnDocument.AFTER },
  );

  if (!updated) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }

  if (bothFormsReady(updated) && updated.status !== "matching") {
    const transitioned = await collection.findOneAndUpdate(
      { _id: updated._id, status: { $ne: "matching" } },
      { $set: { status: "matching" } },
      { returnDocument: ReturnDocument.AFTER },
    );
    if (transitioned) return toPublicSessionState(transitioned);
  }

  return toPublicSessionState(updated);
}

export async function getDeck(sessionId: string): Promise<MovieShow[]> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!doc) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  if (!bothFormsReady(doc)) {
    throw new WatcherSessionError(
      409,
      "FORMS_NOT_READY",
      "Both participants must complete their forms before fetching the deck",
    );
  }

  const combined = [
    ...doc.participants.p1.entries,
    ...doc.participants.p2.entries,
  ];

  if (doc.activeDeck && doc.activeDeck.length > 0) {
    const activeIds = new Set(doc.activeDeck);
    return combined.filter((e) => activeIds.has(e.id));
  }
  return combined;
}

export async function submitSwipes(
  sessionId: string,
  slot: ParticipantSlot,
  likes: string[],
  dislikes: string[],
): Promise<PublicSessionState> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(sessionId) },
    {
      $set: {
        [`participants.${slot}.likes`]: likes,
        [`participants.${slot}.dislikes`]: dislikes,
        [`participants.${slot}.swipesDone`]: true,
      },
    },
    { returnDocument: ReturnDocument.AFTER },
  );
  if (!updated) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }

  if (
    updated.participants.p1.swipesDone &&
    updated.participants.p2.swipesDone &&
    updated.status !== "results"
  ) {
    const transitioned = await collection.findOneAndUpdate(
      { _id: updated._id, status: { $ne: "results" } },
      { $set: { status: "results" } },
      { returnDocument: ReturnDocument.AFTER },
    );
    if (transitioned) return toPublicSessionState(transitioned);
  }

  return toPublicSessionState(updated);
}

export async function getMatches(sessionId: string): Promise<string[]> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!doc) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  if (
    !doc.participants.p1.swipesDone ||
    !doc.participants.p2.swipesDone
  ) {
    throw new WatcherSessionError(
      409,
      "SWIPES_NOT_DONE",
      "Both participants must finish swiping before matches are available",
    );
  }
  const p1Likes = new Set(doc.participants.p1.likes);
  return doc.participants.p2.likes.filter((id) => p1Likes.has(id));
}

export async function rematch(
  sessionId: string,
  rematchMode: "narrow" | "retry",
): Promise<PublicSessionState> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!doc) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  if (
    !doc.participants.p1.swipesDone ||
    !doc.participants.p2.swipesDone
  ) {
    throw new WatcherSessionError(
      409,
      "SWIPES_NOT_DONE",
      "Cannot rematch until both participants have finished swiping",
    );
  }

  let activeDeck: string[] | undefined;
  if (rematchMode === "narrow") {
    const p1Likes = new Set(doc.participants.p1.likes);
    activeDeck = doc.participants.p2.likes.filter((id) => p1Likes.has(id));
    if (activeDeck.length < 2) {
      throw new WatcherSessionError(
        400,
        "NOT_ENOUGH_MATCHES_TO_NARROW",
        "Need at least 2 prior matches to narrow the deck",
      );
    }
  }

  const updated = await collection.findOneAndUpdate(
    { _id: doc._id },
    {
      $set: {
        "participants.p1.likes": [],
        "participants.p1.dislikes": [],
        "participants.p1.swipesDone": false,
        "participants.p2.likes": [],
        "participants.p2.dislikes": [],
        "participants.p2.swipesDone": false,
        status: "matching",
        rounds: doc.rounds + 1,
        ...(activeDeck ? { activeDeck } : {}),
      },
      ...(rematchMode === "retry" ? { $unset: { activeDeck: "" } } : {}),
    },
    { returnDocument: ReturnDocument.AFTER },
  );

  if (!updated) {
    throw new WatcherSessionError(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }
  return toPublicSessionState(updated);
}

export async function cleanupExpiredSessions(): Promise<{ deleted: number }> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  const result = await collection.deleteMany({ expiresAt: { $lte: new Date() } });
  return { deleted: result.deletedCount ?? 0 };
}

export async function ensureWatcherIndexes(): Promise<void> {
  const collection = getCollection<WatcherSessionDoc>(COLLECTION);
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
