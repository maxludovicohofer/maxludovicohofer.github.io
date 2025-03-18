import { completeAuthorization } from "@integrations/google/google";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async (Astro) =>
  await completeAuthorization(Astro);
