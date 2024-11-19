import { defineCollection, z } from "astro:content";
// Define your collection(s)
const projects = defineCollection({
  type: "content",
  schema: z.object({
    draft: z.boolean().optional(),
    title: z.string(),
    description: z.string(),
    roles: z.array(z.string()),
    tech: z.array(z.string()),
  }),
});

const thoughts = defineCollection({
  type: "content",
  schema: z.object({
    draft: z.boolean().optional(),
    title: z.string(),
  }),
});

// Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  projects,
  thoughts,
};
