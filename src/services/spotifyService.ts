import {
  SpotifyApi,
  type AccessToken,
  type Artist,
  type IValidateResponses,
  type MaxInt,
  type Page,
  type Track,
} from "@spotify/web-api-ts-sdk";

export type TopItemsTimeRange = "short_term" | "medium_term" | "long_term";

export class SpotifyApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly body?: string;

  constructor(
    message: string,
    status: number,
    options: { retryAfterSeconds?: number; body?: string } = {},
  ) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.body = options.body;
  }
}

class StatusPreservingResponseValidator implements IValidateResponses {
  async validateResponse(response: Response): Promise<void> {
    if (response.status >= 200 && response.status < 300) return;

    const body = await response.text().catch(() => "");
    if (response.status === 429) {
      const retryAfterRaw = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterRaw
        ? Number.parseInt(retryAfterRaw, 10)
        : undefined;
      throw new SpotifyApiError("Spotify rate limit exceeded", 429, {
        retryAfterSeconds: Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds
          : undefined,
        body,
      });
    }
    throw new SpotifyApiError(
      `Spotify request failed: ${response.status} ${response.statusText}`,
      response.status,
      { body },
    );
  }
}

function getClientId(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "SPOTIFY_CLIENT_ID environment variable is not defined. Set it in .env or your deployment environment.",
    );
  }
  return clientId;
}

function buildSdk(accessToken: string): SpotifyApi {
  const token: AccessToken = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "",
  };
  return SpotifyApi.withAccessToken(getClientId(), token, {
    responseValidator: new StatusPreservingResponseValidator(),
  });
}

export async function getUserTopArtists(
  accessToken: string,
  params: {
    timeRange: TopItemsTimeRange;
    limit: MaxInt<50>;
    offset: number;
  },
): Promise<Page<Artist>> {
  const sdk = buildSdk(accessToken);
  return sdk.currentUser.topItems(
    "artists",
    params.timeRange,
    params.limit,
    params.offset,
  );
}

export async function getUserTopTracks(
  accessToken: string,
  params: {
    timeRange: TopItemsTimeRange;
    limit: MaxInt<50>;
    offset: number;
  },
): Promise<Page<Track>> {
  const sdk = buildSdk(accessToken);
  return sdk.currentUser.topItems(
    "tracks",
    params.timeRange,
    params.limit,
    params.offset,
  );
}
