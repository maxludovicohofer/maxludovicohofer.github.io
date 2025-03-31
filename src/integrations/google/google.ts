import { auth, youtube } from "@googleapis/youtube";
import type { APIContext, AstroGlobal } from "astro";
import {
  GOOGLE_BASE_CREDENTIALS,
  GOOGLE_CLIENT_SECRET,
} from "astro:env/server";
import type { GaxiosError, GaxiosPromise } from "gaxios";
import type { Credentials, OAuth2Client } from "google-auth-library";

const credentialsPath = "src/integrations/google/credentials.json";

// https://developers.google.com/identity/protocols/oauth2/scopes#youtube
const scopes = [
  // Manage your YouTube account
  "https://www.googleapis.com/auth/youtube",
  // See a list of your current active channel members, their current level, and when they became a member
  "https://www.googleapis.com/auth/youtube.channel-memberships.creator",
  // See, edit, and permanently delete your YouTube videos, ratings, comments and captions
  "https://www.googleapis.com/auth/youtube.force-ssl",
  // View your YouTube account
  "https://www.googleapis.com/auth/youtube.readonly",
  // Manage your YouTube videos
  "https://www.googleapis.com/auth/youtube.upload",
  // View and manage your assets and associated content on YouTube
  "https://www.googleapis.com/auth/youtubepartner",
  // View private information of your YouTube channel relevant during the audit process with a YouTube partner
  "https://www.googleapis.com/auth/youtubepartner-channel-audit",
] as const;

interface GoogleError extends GaxiosError {
  errors?: [{ message: string; domain: string; reason: string }];
}

let authorization: OAuth2Client | undefined;

export const getAuth = async (
  ...params: Parameters<typeof getTokenSettings>
) => {
  if (authorization) return authorization;

  const oAuthClient = await getOAuthClient(params[0]);
  const tokenSettings = getTokenSettings(...params);

  const { readFile } = await import("fs/promises");

  // Check if existing credentials.
  let credentials: string;
  try {
    credentials = await readFile(credentialsPath, "utf-8");
  } catch {
    if (import.meta.env.DEV) {
      throw new Error(
        `Google: authorize at ${oAuthClient.generateAuthUrl(tokenSettings)}`,
      );
    }

    console.warn("Using base credentials.");
    credentials = GOOGLE_BASE_CREDENTIALS;
  }

  oAuthClient.credentials = JSON.parse(credentials);

  if (!oAuthClient.credentials.refresh_token) {
    await refreshToken(oAuthClient, tokenSettings, ...params);
  }

  authorization = oAuthClient;
  return authorization;
};

export const completeAuthorization = async (astro: APIContext) => {
  const responseCode = astro.url.searchParams.get("code");

  if (responseCode) {
    let credentials: Credentials;

    try {
      credentials = (await (await getOAuthClient(astro)).getToken(responseCode))
        .tokens;
    } catch (e) {
      const error = e as GoogleError;
      throw new Error(
        `Google: error while trying to retrieve access token: ${error.message}`,
      );
    }

    // Store credentials
    import("fs/promises").then(({ writeFile }) =>
      writeFile(credentialsPath, JSON.stringify(credentials)),
    );
  }

  return astro.redirect(astro.url.searchParams.get("state") ?? "/");
};

interface ClientSecret {
  web?: {
    client_id: string;
    client_secret: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
  };
}

const getTokenSettings = (
  astro: AstroGlobal,
  scope: typeof scopes | (typeof scopes)[number],
) =>
  ({
    access_type: "offline",
    state: astro.url.pathname,
    scope: scope as string | string[],
    include_granted_scopes: true,
  }) satisfies Parameters<OAuth2Client["generateAuthUrl"]>[0];

const getOAuthClient = async (astro: APIContext) => {
  const { web } = JSON.parse(GOOGLE_CLIENT_SECRET) as ClientSecret;

  if (!web) {
    throw new Error(
      'Google: wrong client_secret file. Expected "web" property.',
    );
  }

  const oauthClient = new auth.OAuth2(
    web.client_id,
    web.client_secret,
    `${astro.url.origin}/oauthcallback`,
  );

  return oauthClient;
};

const service = youtube("v3");

let quotaExceeded: boolean;
let uploadsExceeded: boolean;

export const isUploadsExceeded = () => uploadsExceeded;

/**
 * Returns null if quota exceeded.
 */
export const callApi = async <R>(
  call: (
    api: typeof service,
    params: {
      auth: OAuth2Client;
      fields: string;
      pageToken?: string;
      maxResults: number;
    },
  ) => GaxiosPromise<R>,
  ...params: Parameters<typeof getAuth>
) => {
  if (quotaExceeded) {
    console.error("Google: quota exceeded");
    return null;
  }

  type PaginatedResponse = R & { nextPageToken: string; items: any[] };

  function hasNextPage(test?: R): test is PaginatedResponse {
    return !!(test as { nextPageToken?: string | null } | undefined)
      ?.nextPageToken;
  }

  const responses: R[] = [];
  let nextPage: string | undefined;

  const auth = await getAuth(...params);

  do {
    let lastResponse: R;

    try {
      lastResponse = (
        await call(service, {
          auth,
          fields: "nextPageToken",
          ...(nextPage ? { pageToken: nextPage } : {}),
          maxResults: 50, // Max
        })
      ).data;
    } catch (e) {
      const error = e as GoogleError;
      switch (error.errors?.[0].reason) {
        case "quotaExceeded":
          quotaExceeded = true;
          console.error("Google: quota exceeded");
          return null;

        case "uploadLimitExceeded":
          uploadsExceeded = true;
          console.error("Google: upload limit exceeded");
          return null;
      }

      if (error.message === "invalid_grant")
        await refreshToken(auth, undefined, ...params);

      throw new Error(
        `Google: API error: ${error.response?.data.error_description ?? error.message}`,
      );
    }

    responses.push(lastResponse);
    nextPage = hasNextPage(lastResponse)
      ? lastResponse.nextPageToken
      : undefined;
  } while (nextPage);

  return responses.length > 1
    ? (responses as PaginatedResponse[]).slice(1).reduce(
        (response, currentPage) => ({
          ...currentPage,
          items: [...response.items, ...currentPage.items],
        }),
        responses[0] as PaginatedResponse,
      )
    : responses[0]!;
};

const refreshToken = async (
  auth?: OAuth2Client,
  tokenSettings?: ReturnType<typeof getTokenSettings>,
  ...params: Parameters<typeof getTokenSettings>
) => {
  throw new Error(
    `Google: refresh at ${(auth ?? (await getAuth(...params))).generateAuthUrl({
      ...(tokenSettings ?? getTokenSettings(...params)),
      prompt: "consent",
    })}`,
  );
};
