import type { AstroGlobal } from "astro";
import { getRole } from "./astro-server";
import { toTextList } from "./text";

export const getSpecializationSentence = async (astro: AstroGlobal) => {
  const specializations = ["mechanics", "combat", "AI", "systems"];

  const { role } = await getRole(astro);

  return `specialized in ${toTextList(
    specializations.filter(
      (specialization) =>
        !role.id.toLowerCase().includes(specialization.toLowerCase())
    )
  )}`;
};
