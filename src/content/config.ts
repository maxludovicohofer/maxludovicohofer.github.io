import { defineCollection, z } from "astro:content";

const post = {
  draft: z.boolean().optional(),
  title: z.string(),
  youTubeVideoId: z.string().url().optional()
};

// Define your collection(s)
const projects = defineCollection({
  type: "content",
  schema: z.object({
    ...post,
    description: z.string(),
    category: z.enum(["Game", "Prototype", "Tool"]),
    roles: z.array(z.string()),
    tech: z.array(z.string()),
    downloadLinks: z.array(z.string().url()).optional(),
    awards: z.array(z.string()).optional(),
  }),
});

const thoughts = defineCollection({
  type: "content",
  schema: z.object(post),
});

// Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  projects,
  thoughts,
};
