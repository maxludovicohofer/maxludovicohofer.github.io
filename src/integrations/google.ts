import type { Credentials, OAuth2Client } from "google-auth-library";
import { auth, youtube, type youtube_v3 } from "@googleapis/youtube";
import type { GaxiosError } from "gaxios";
import type { APIContext, AstroGlobal } from "astro";

interface ClientSecret {
  web: {
    client_id: string;
    client_secret: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
  };
}

const credentialsPath = `.credentials/google.json`;

let authorization: OAuth2Client | undefined;

export const authorize = async (astro: AstroGlobal) => {
  if (authorization) return authorization;

  const oAuthClient = await getOAuthClient(astro);

  const { readFile } = await import("fs/promises");

  // Check if we have previously stored a token.
  try {
    oAuthClient.credentials = JSON.parse(
      await readFile(credentialsPath, "utf-8")
    );
  } catch {
    throw new Error(
      `Google: authorize at ${oAuthClient.generateAuthUrl({
        access_type: "offline",
        // If modifying these scopes, delete your previously saved credentials
        // at ~/.credentials/youtube-nodejs-quickstart.json
        scope: ["https://www.googleapis.com/auth/youtube.readonly"],
        state: astro.url.pathname,
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
      const error = e as GaxiosError;
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

  const {
    web: { client_id, client_secret },
  } = JSON.parse(clientSecret) as ClientSecret;

  return new auth.OAuth2(
    client_id,
    client_secret,
    `${astro.url.origin}/oauthcallback`
  );
};

export const getChannel = async (...params: Parameters<typeof authorize>) => {
  const api = youtube("v3");

  let channels: youtube_v3.Schema$Channel[] | undefined;

  try {
    channels = (
      await api.channels.list({
        auth: authorization ?? (await authorize(...params)),
        part: ["snippet", "contentDetails", "statistics"],
        forUsername: "GoogleDevelopers",
      })
    ).data.items;
  } catch (e) {
    const error = e as GaxiosError;
    throw new Error(`Google: the API returned an error: ${error.message}`);
  }

  if (!channels?.length) {
    console.log("Google: no channel found.");
    return;
  }

  console.log(
    "Google: this channel's ID is %s. Its title is '%s', and " +
      "it has %s views.",
    channels[0]!.id,
    channels[0]!.snippet?.title,
    channels[0]!.statistics?.viewCount
  );
};
