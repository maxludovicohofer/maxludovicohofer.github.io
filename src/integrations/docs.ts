import type { AstroGlobal } from "astro";
import { getRole } from "./astro-server";
import { toTextList } from "./text";
import { getCollection } from "astro:content";

export const getSpecializationSentence = async (astro: AstroGlobal) => {
  const { role } = await getRole(astro);

  const specializations =
    role.data.specializations ??
    (await getCollection("roles"))[0]?.data.specializations;

  return specializations
    ? `specialized in ${toTextList(
        specializations.filter(
          (specialization) =>
            role.id.search(new RegExp(`\\b${specialization}\\b`)) === -1
        )
      )}`
    : "";
};

export const getWorkFieldsSentence = async (astro: AstroGlobal) => {
  const { role } = await getRole(astro);

  const workFields =
    role.data.workFields ?? (await getCollection("roles"))[0]?.data.workFields;

  if (!workFields) return "";

  return `Especially involved in ${toTextList(workFields)}.`;
};
