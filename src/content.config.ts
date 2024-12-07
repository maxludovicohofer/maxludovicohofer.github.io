import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const post = {
  draft: z.boolean().optional(),
  title: z.string(),
  youTubeID: z.string().optional(),
  youTubeAspectRatio: z.enum(["16/9", "16/10"]).optional(),
};

// Define your collection(s)
const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/projects" }),
  schema: z.object({
    ...post,
    description: z.string().max(120),
    category: z.enum(["Game", "Prototype", "Tool"]),
    developmentTime: z.string().duration(),
    team: z.number().int().positive().optional(),
    roles: z.array(z.string()).optional(),
    tech: z.array(z.string()),
    downloadLinks: z.array(z.string().url()).optional(),
    awards: z.array(z.string()).optional(),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/thoughts" }),
  schema: z.object(post),
});

// Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  projects,
  thoughts,
};
