import { defineCollection, reference, z } from "astro:content";
import { file, glob } from "astro/loaders";

const post = z.object({
  draft: z.boolean().optional(),
  title: z.string(),
  publishingDate: z.date().optional(),
  youTubeID: z.string().optional(),
  youTubeAspectRatio: z.enum(["16/9", "16/10"]).optional(),
});

// Define your collection(s)
const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "data/projects" }),
  schema: post.extend({
    description: z.string().max(120),
    category: z.enum(["Game", "Prototype", "Tool"]),
    developmentTime: z.string().duration(),
    team: z.number().int().positive().optional(),
    roles: z.array(z.string()).optional(),
    tech: z.array(reference("tech")),
    downloadLinks: z.array(z.string().url()).optional(),
    awards: z.array(z.string()).optional(),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "data/thoughts" }),
  schema: post,
});

const tech = defineCollection({
  loader: file("data/tech.yaml"),
  schema: z.object({
    id: z.string(),
    experience: z.string().duration().optional(),
    functionalities: z
      .string()
      .or(
        z.object({
          id: z.string(),
          experience: z.string().duration(),
        })
      )
      .array()
      .optional(),
  }),
});

// Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  projects,
  thoughts,
  tech,
};
