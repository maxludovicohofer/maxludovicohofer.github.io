import { completeAuthorization } from "@integrations/google";
import type { APIRoute } from "astro";

//? Only working in dev
export const prerender = import.meta.env.PROD;

export const getStaticPaths = () => [
  { params: { path: undefined }, props: {} },
];

export const GET: APIRoute = async (Astro) =>
  await completeAuthorization(Astro);
