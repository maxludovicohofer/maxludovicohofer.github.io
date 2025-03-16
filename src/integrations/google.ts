import type { Credentials, OAuth2Client } from "google-auth-library";
import { auth, youtube } from "@googleapis/youtube";
import type { GaxiosError } from "gaxios";
import type { APIContext, AstroGlobal } from "astro";

const credentialsPath = `.credentials/google.json`;

const scopes = ["https://www.googleapis.com/auth/youtube.force-ssl"] as const;

let authorization: OAuth2Client | undefined;

export const getAuth = async (
  astro: AstroGlobal,
  scope: typeof scopes | (typeof scopes)[number]
) => {
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
        scope: scope as string | string[],
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

  return new auth.OAuth2(
    web.client_id,
    web.client_secret,
    `${astro.url.origin}/oauthcallback`
  );
};

// export const getChannel = async (astro: AstroGlobal) => {
// try {
//   await captions.list({
//     auth: await getAuth(
//       astro,
//       "https://www.googleapis.com/auth/youtube.force-ssl"
//     ),
//     part: ["id", "snippet"],
//   });
// } catch (e) {
//   const error = e as GaxiosError;
//   throw new Error(`Google: the API returned an error: ${error.message}`);
// }
// let retrievedChannels: youtube_v3.Schema$Channel[] | undefined;
// try {
//   retrievedChannels = (
//     await channels.list({
//       auth: await getAuth(...params),
//       part: ["snippet", "contentDetails", "statistics"],
//       forUsername: "GoogleDevelopers",
//     })
//   ).data.items;
// } catch (e) {
//   const error = e as GaxiosError;
//   throw new Error(`Google: the API returned an error: ${error.message}`);
// }
// if (!retrievedChannels?.length) {
//   console.log("Google: no channel found.");
//   return;
// }
// console.log(
//   "Google: this channel's ID is %s. Its title is '%s', and " +
//     "it has %s views.",
//   retrievedChannels[0]!.id,
//   retrievedChannels[0]!.snippet?.title,
//   retrievedChannels[0]!.statistics?.viewCount
// );
// };

export const getShowreels = async (astro: AstroGlobal) => {
  return await callApi(
    ({ videos }, auth) => videos.list({ auth, part: ["id", "snippet"] }),
    astro,
    "https://www.googleapis.com/auth/youtube.force-ssl"
  );
};

const service = youtube("v3");

export const callApi = async <R>(
  call: (
    api: typeof service,
    auth: Awaited<ReturnType<typeof getAuth>>
  ) => Promise<R>,
  ...params: Parameters<typeof getAuth>
) => {
  try {
    return await call(service, await getAuth(...params));
  } catch (e) {
    const error = e as GaxiosError;
    throw new Error(`Google: the API returned an error: ${error.message}`);
  }
};
