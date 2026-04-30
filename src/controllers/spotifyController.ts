import { Request, Response } from "express";
import type { MaxInt } from "@spotify/web-api-ts-sdk";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../utils/errorHandler.js";
import {
  getUserTopArtists,
  getUserTopTracks,
  SpotifyApiError,
  type TopItemsTimeRange,
} from "../services/spotifyService.js";

const VALID_TIME_RANGES: ReadonlyArray<TopItemsTimeRange> = [
  "short_term",
  "medium_term",
  "long_term",
];

function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function parseIntegerInRange(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number | null {
  if (raw === undefined) return fallback;
  if (typeof raw !== "string") return null;
  if (!/^-?\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  if (value < min || value > max) return null;
  return value;
}

export async function getMyTopArtists(
  req: Request,
  res: Response,
): Promise<void> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    res
      .status(401)
      .json(
        createErrorResponse(
          "Missing or malformed Authorization header. Expected 'Authorization: Bearer <spotify_access_token>'.",
          "MISSING_ACCESS_TOKEN",
        ),
      );
    return;
  }

  const timeRangeRaw = req.query.time_range ?? "medium_term";
  if (
    typeof timeRangeRaw !== "string" ||
    !VALID_TIME_RANGES.includes(timeRangeRaw as TopItemsTimeRange)
  ) {
    res
      .status(400)
      .json(
        createErrorResponse(
          `Invalid time_range. Must be one of: ${VALID_TIME_RANGES.join(", ")}.`,
          "INVALID_TIME_RANGE",
        ),
      );
    return;
  }
  const timeRange = timeRangeRaw as TopItemsTimeRange;

  const limit = parseIntegerInRange(req.query.limit, 20, 1, 50);
  if (limit === null) {
    res
      .status(400)
      .json(
        createErrorResponse(
          "Invalid limit. Must be an integer between 1 and 50.",
          "INVALID_LIMIT",
        ),
      );
    return;
  }

  const offset = parseIntegerInRange(req.query.offset, 0, 0, 49);
  if (offset === null) {
    res
      .status(400)
      .json(
        createErrorResponse(
          "Invalid offset. Must be an integer between 0 and 49.",
          "INVALID_OFFSET",
        ),
      );
    return;
  }

  try {
    const page = await getUserTopArtists(accessToken, {
      timeRange,
      limit: limit as MaxInt<50>,
      offset,
    });
    res.json(createSuccessResponse(page));
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      if (err.status === 401) {
        res
          .status(401)
          .json(
            createErrorResponse(
              "Spotify rejected the access token. Re-authenticate the user.",
              "SPOTIFY_TOKEN_INVALID",
              err.body || undefined,
            ),
          );
        return;
      }
      if (err.status === 403) {
        res
          .status(403)
          .json(
            createErrorResponse(
              "Spotify denied the request. If this app is in Development Mode, your Spotify account must be added to the app's User Management allowlist in the Spotify Developer Dashboard. Alternatively, the app may need Extended Quota Mode to serve all users.",
              "SPOTIFY_FORBIDDEN",
              err.body || undefined,
            ),
          );
        return;
      }
      if (err.status === 429) {
        if (err.retryAfterSeconds !== undefined) {
          res.setHeader("Retry-After", String(err.retryAfterSeconds));
        }
        res
          .status(429)
          .json(
            createErrorResponse(
              "Spotify rate limit exceeded. Honor the Retry-After header before retrying.",
              "SPOTIFY_RATE_LIMITED",
              { retryAfterSeconds: err.retryAfterSeconds, body: err.body },
            ),
          );
        return;
      }
    }
    throw err;
  }
}

export async function getMyTopTracks(
  req: Request,
  res: Response,
): Promise<void> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    res
      .status(401)
      .json(
        createErrorResponse(
          "Missing or malformed Authorization header. Expected 'Authorization: Bearer <spotify_access_token>'.",
          "MISSING_ACCESS_TOKEN",
        ),
      );
    return;
  }

  const timeRangeRaw = req.query.time_range ?? "medium_term";
  if (
    typeof timeRangeRaw !== "string" ||
    !VALID_TIME_RANGES.includes(timeRangeRaw as TopItemsTimeRange)
  ) {
    res
      .status(400)
      .json(
        createErrorResponse(
          `Invalid time_range. Must be one of: ${VALID_TIME_RANGES.join(", ")}.`,
          "INVALID_TIME_RANGE",
        ),
      );
    return;
  }
  const timeRange = timeRangeRaw as TopItemsTimeRange;

  const limit = parseIntegerInRange(req.query.limit, 20, 1, 50);
  if (limit === null) {
    res
      .status(400)
      .json(
        createErrorResponse(
          "Invalid limit. Must be an integer between 1 and 50.",
          "INVALID_LIMIT",
        ),
      );
    return;
  }

  const offset = parseIntegerInRange(req.query.offset, 0, 0, 49);
  if (offset === null) {
    res
      .status(400)
      .json(
        createErrorResponse(
          "Invalid offset. Must be an integer between 0 and 49.",
          "INVALID_OFFSET",
        ),
      );
    return;
  }

  try {
    const page = await getUserTopTracks(accessToken, {
      timeRange,
      limit: limit as MaxInt<50>,
      offset,
    });
    res.json(createSuccessResponse(page));
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      if (err.status === 401) {
        res
          .status(401)
          .json(
            createErrorResponse(
              "Spotify rejected the access token. Re-authenticate the user.",
              "SPOTIFY_TOKEN_INVALID",
              err.body || undefined,
            ),
          );
        return;
      }
      if (err.status === 403) {
        res
          .status(403)
          .json(
            createErrorResponse(
              "Spotify denied the request. If this app is in Development Mode, your Spotify account must be added to the app's User Management allowlist in the Spotify Developer Dashboard. Alternatively, the app may need Extended Quota Mode to serve all users.",
              "SPOTIFY_FORBIDDEN",
              err.body || undefined,
            ),
          );
        return;
      }
      if (err.status === 429) {
        if (err.retryAfterSeconds !== undefined) {
          res.setHeader("Retry-After", String(err.retryAfterSeconds));
        }
        res
          .status(429)
          .json(
            createErrorResponse(
              "Spotify rate limit exceeded. Honor the Retry-After header before retrying.",
              "SPOTIFY_RATE_LIMITED",
              { retryAfterSeconds: err.retryAfterSeconds, body: err.body },
            ),
          );
        return;
      }
    }
    throw err;
  }
}
