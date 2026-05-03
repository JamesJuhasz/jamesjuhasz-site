import type { SchemaTypeDefinition } from "sanity";

export const pressMentionSchema: SchemaTypeDefinition = {
  name: "pressMention",
  title: "Press mention",
  type: "document",
  fields: [
    { name: "publication", type: "string", validation: (R) => R.required() },
    { name: "articleTitle", type: "string", validation: (R) => R.required() },
    { name: "publishedAt", type: "date", validation: (R) => R.required() },
    {
      name: "externalUrl",
      type: "url",
      validation: (R) => R.required(),
    },
    {
      name: "logo",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", type: "string", title: "Alt text" }],
    },
    {
      name: "excerpt",
      type: "string",
      description: "Optional 1-line excerpt.",
    },
  ],
  preview: {
    select: {
      title: "articleTitle",
      pub: "publication",
      date: "publishedAt",
    },
    prepare({
      title,
      pub,
      date,
    }: {
      title?: string;
      pub?: string;
      date?: string;
    }) {
      return {
        title: title ?? "(no title)",
        subtitle: `${pub ?? "?"} · ${date ?? ""}`,
      };
    },
  },
} as SchemaTypeDefinition;
