import { getChannel } from "@integrations/google";

// TODO USE YOUTUBE DATA API TO DUPLICATE SHOWREEL FOR EACH ROLE AND AUTO GENERATE CAPTIONS FOR IT FROM PORTFOLIO DATA

// TODO GENERATE SHOWREEL CAPTIONS FROM PROJECT DATA
export const generateShowreelCaptions = async (
  ...params: Parameters<typeof getChannel>
) => {
  const projects = [
    "steelsilk-championship",
    "lolita",
    "inversion",
    "duchessas-world",
  ];

  const secondsPerProject = 30;

  // await getChannel(...params);
};
