import { ObjectId } from "mongodb";

export type SessionMode = "solo-entry" | "dual-entry";

export type SessionStatus =
  | "waiting-for-partner"
  | "form"
  | "matching"
  | "results";

export type ParticipantSlot = "p1" | "p2";

export interface MovieShow {
  id: string;
  title: string;
  description?: string;
  service?: string;
}

export interface ParticipantState {
  token?: string;
  entries: MovieShow[];
  formReady: boolean;
  likes: string[];
  dislikes: string[];
  swipesDone: boolean;
}

export interface WatcherSessionDoc {
  _id: ObjectId;
  code: string;
  mode: SessionMode;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  participants: {
    p1: ParticipantState;
    p2: ParticipantState;
  };
  activeDeck?: string[];
  rounds: number;
}

export interface PublicParticipantState {
  present: boolean;
  formReady: boolean;
  swipesDone: boolean;
  entryCount: number;
}

export interface PublicSessionState {
  sessionId: string;
  code: string;
  mode: SessionMode;
  status: SessionStatus;
  rounds: number;
  expiresAt: string;
  participants: {
    p1: PublicParticipantState;
    p2: PublicParticipantState;
  };
}

export interface CreateSessionResult {
  sessionId: string;
  code: string;
  participantToken: string;
}

export interface JoinSessionResult {
  sessionId: string;
  participantToken: string;
  state: PublicSessionState;
}
