import { locales } from "@integrations/astro-config";
import { file, glob } from "astro/loaders";
import { defineCollection, reference, z } from "astro:content";

const fileSchema = z.object({
  id: z.string(),
});

const roles = defineCollection({
  loader: file("src/data/roles.yaml"),
  schema: fileSchema.extend({
    matches: z.array(reference("roles")).optional(),
    notMatches: z.array(reference("roles")).optional(),
    workFields: z.string().array().optional(),
    specializations: z.string().array().optional(),
  }),
});

const resumeProps = z
  .boolean()
  .or(reference("roles").array())
  .or(
    z.object({
      build: z.boolean().or(reference("roles").array()).optional(),
      full: z.boolean().optional(),
      singleApplication: z.boolean().optional(),
    }),
  )
  .optional();

const companies = defineCollection({
  loader: file("src/data/companies.yaml"),
  schema: fileSchema.extend({
    localizedIds: z.record(z.enum(locales), z.string()).optional(),
    resume: resumeProps,
    resumeJa: resumeProps,
  }),
});

const tech = defineCollection({
  loader: file("src/data/tech.yaml"),
  schema: fileSchema.extend({
    experience: z.string().duration(),
    roles: z.array(reference("roles")),
    group: z.string().optional(),
    functionalities: z
      .array(
        z.string().or(
          fileSchema.extend({
            roles: z.array(reference("roles")),
            dontTranslateId: z.boolean().optional(),
          }),
        ),
      )
      .optional(),
    translateId: z.boolean().optional(),
  }),
});

const maxDate = new Date();
const minDate = new Date("1997-09-01");

const teamContent = z.object({
  team: z
    .number()
    .int()
    .positive()
    .or(
      z.object({
        internal: z.number().int().positive(),
        external: z.number().int().positive(),
      }),
    )
    .optional(),
});

const knowHow = defineCollection({
  loader: file("src/data/know-how.yaml"),
  schema: fileSchema
    .extend({
      start: z.date().max(maxDate).min(minDate),
      end: z.date().max(maxDate).min(minDate).optional(),
      school: z.boolean().optional(),
      dropOut: z.boolean().optional(),
      reasonForLeaving: z.string().optional(),
      projects: z.array(reference("projects")).optional(),
      tech: z.array(reference("tech")).optional(),
      skills: z.array(
        z.object({
          job: reference("roles"),
          tasks: z.string().array(),
          achievements: z.string().array(),
          countAsWork: z.boolean().optional(),
        }),
      ),
      translateId: z.boolean().optional(),
    })
    .merge(teamContent),
});

const certifications = defineCollection({
  loader: file("src/data/certifications.yaml"),
  schema: fileSchema.extend({
    institution: z.string(),
    date: z.date().max(maxDate).min(minDate),
    content: reference("projects").optional(),
    translateInstitution: z.boolean().optional(),
    type: z.enum(["award"]).optional(),
  }),
});

const languages = defineCollection({
  loader: file("src/data/languages.yaml"),
  schema: fileSchema.extend({
    code: z.string(),
    level: z.enum(["native", "fluent", "business", "everyday"]),
  }),
});

const documents = z.object({
  title: z.string().optional(),
  draft: z.boolean().optional(),
  publishingDate: z.date().max(maxDate).min(minDate).optional(),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/docs" }),
  schema: documents,
});

const posts = documents.extend({
  youTubeID: z.string().optional(),
  youTubeAspectRatio: z.enum(["16/9", "16/10", "1/1", "3/4"]).optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/projects" }),
  schema: posts
    .extend({
      category: z.enum(["game", "prototype", "tool"]).optional(),
      developmentTime: z.string().duration(),
      tech: z.array(reference("tech")),
      downloadLinks: z.array(z.string().url()).optional(),
      awards: z.array(z.string()).optional(),
      roles: z.array(
        z.object({
          role: reference("roles"),
          tasks: z.string().array(),
          achievements: z.array(z.string()),
        }),
      ),
    })
    .merge(teamContent),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/thoughts" }),
  schema: posts.extend({ forRoles: z.array(reference("roles")).optional() }),
});

export const translationsPath = "src/data/translations";

const translations = defineCollection({
  loader: glob({ pattern: "**/[^_]*.json", base: translationsPath }),
  schema: z.record(
    z.object({
      translation: z.string(),
      api: z.enum(["deepl"]).optional(),
    }),
  ),
});

const videos = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "src/data/videos" }),
  schema: z.array(
    z.object({
      role: reference("roles"),
      youTubeId: z.string(),
      categoryId: z.string(),
      captions: z.array(
        z.object({
          locale: z.enum(locales),
          youTubeId: z.string(),
          text: z.string(),
        }),
      ),
    }),
  ),
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  roles,
  companies,
  tech,
  ["know-how"]: knowHow,
  certifications,
  languages,
  docs,
  projects,
  thoughts,
  translations,
  videos,
};
