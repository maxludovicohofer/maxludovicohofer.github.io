import { Octokit } from "@octokit/rest";
import { GITHUB_TOKEN } from "astro:env/server";
import { execSync } from "child_process";
import sodium from "libsodium-wrappers";

export async function updateGithubSecret(
  secretName: string,
  secretValue: string,
): Promise<void> {
  const { actions: github } = new Octokit({
    auth: GITHUB_TOKEN ?? process.env.GITHUB_TOKEN,
  });
  await sodium.ready;

  const { owner, repo } = getGithubOwnerAndRepo();

  const {
    data: { key, key_id },
  } = await github.getRepoPublicKey({ owner, repo });

  await github.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: secretName,
    encrypted_value: sodium.to_base64(
      sodium.crypto_box_seal(
        sodium.from_string(secretValue),
        sodium.from_base64(key, sodium.base64_variants.ORIGINAL),
      ),
      sodium.base64_variants.ORIGINAL,
    ),
    key_id,
  });

  console.info(`GitHub secret ${secretName} updated successfully.`);
}

const getGithubOwnerAndRepo = () => {
  const url = execSync("git config --get remote.origin.url", {
    encoding: "utf8",
  }).trim();

  // git@github.com:owner/repo.git
  const sshMatch = /git@[^:]+:([^/]+)\/(.+)\.git/.exec(url);
  if (sshMatch) return { owner: sshMatch[1]!, repo: sshMatch[2]! };

  // https://github.com/owner/repo.git
  // https://github.com/owner/repo
  const httpsMatch = /https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
  if (httpsMatch) return { owner: httpsMatch[1]!, repo: httpsMatch[2]! };

  throw new Error(`Cannot parse GitHub repo from URL: ${url}`);
};
