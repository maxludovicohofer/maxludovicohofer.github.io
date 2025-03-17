import type { Credentials, OAuth2Client } from "google-auth-library";
import { auth, youtube } from "@googleapis/youtube";
import type { GaxiosError, GaxiosPromise } from "gaxios";
import type { APIContext, AstroGlobal } from "astro";

const credentialsPath = `.credentials/google.json`;

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
  astro: AstroGlobal,
  scope: typeof scopes | (typeof scopes)[number]
) => {
  if (authorization) return authorization;

  const oAuthClient = await getOAuthClient(astro);

  const { readFile } = await import("fs/promises");

  const tokenSettings: Parameters<typeof oAuthClient.generateAuthUrl>[0] = {
    access_type: "offline",
    state: astro.url.pathname,
    scope: scope as string | string[],
    include_granted_scopes: true,
  };

  // Check if we have previously stored a token.
  try {
    oAuthClient.credentials = JSON.parse(
      await readFile(credentialsPath, "utf-8")
    );
  } catch {
    throw new Error(
      `Google: authorize at ${oAuthClient.generateAuthUrl(tokenSettings)}`
    );
  }

  if (!oAuthClient.credentials.refresh_token) {
    throw new Error(
      `Google: refresh at ${oAuthClient.generateAuthUrl({
        ...tokenSettings,
        prompt: "consent",
      })}`
    );
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
        `Google: error while trying to retrieve access token: ${error.message}`
      );
    }

    storeCredentials(credentials);
  }

  return astro.redirect(astro.url.searchParams.get("state") ?? "/");
};

const storeCredentials = async (token: Credentials) => {
  const { mkdir, writeFile } = await import("fs/promises");
  const { dirname } = await import("path");

  try {
    await mkdir(dirname(credentialsPath));
  } catch {
    // Directory exists
  }

  writeFile(credentialsPath, JSON.stringify(token));
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

const getOAuthClient = async (astro: APIContext) => {
  const { readFile } = await import("fs/promises");

  let clientSecret: string;

  // Load client secrets from a local file.
  try {
    clientSecret = await readFile("client_secret.json", "utf-8");
  } catch {
    throw new Error(
      "Google: no client_secret file. Download and place in root."
    );
  }

  const { web } = JSON.parse(clientSecret) as ClientSecret;

  if (!web) {
    throw new Error(
      'Google: wrong client_secret file. Expected "web" property.'
    );
  }

  const oauthClient = new auth.OAuth2(
    web.client_id,
    web.client_secret,
    `${astro.url.origin}/oauthcallback`
  );

  return oauthClient;
};

const service = youtube("v3");

/**
 * Returns null if quota exceeded.
 */
export const callApi = async <R>(
  call: (
    api: typeof service,
    params: {
      auth: Awaited<ReturnType<typeof getAuth>>;
      fields: string;
      pageToken?: string;
      maxResults: number;
    }
  ) => GaxiosPromise<R>,
  ...params: Parameters<typeof getAuth>
) => {
  type PaginatedResponse = R & { nextPageToken: string; items: any[] };

  function hasNextPage(test?: R): test is PaginatedResponse {
    return !!(test as { nextPageToken?: string | null } | undefined)
      ?.nextPageToken;
  }

  const responses: R[] = [];
  let nextPage: string | undefined;

  do {
    let lastResponse: R;

    try {
      lastResponse = (
        await call(service, {
          auth: await getAuth(...params),
          fields: "nextPageToken",
          ...(nextPage ? { pageToken: nextPage } : {}),
          maxResults: 50, // Max
        })
      ).data;
    } catch (e) {
      const error = e as GoogleError;
      if (error.errors?.[0].reason === "quotaExceeded") {
        console.info("Google: quota exceeded");
        return null;
      }

      throw new Error(`Google: the API returned an error: ${error.message}`);
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
        responses[0] as PaginatedResponse
      )
    : responses[0]!;
};
