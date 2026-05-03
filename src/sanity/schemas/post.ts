import type { SchemaTypeDefinition } from "sanity";

export const postSchema: SchemaTypeDefinition = {
  name: "post",
  title: "Newsletter post",
  type: "document",
  fields: [
    { name: "title", type: "string", validation: (R) => R.required().max(120) },
    {
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (R) => R.required(),
    },
    {
      name: "publishedAt",
      type: "datetime",
      validation: (R) => R.required(),
    },
    {
      name: "excerpt",
      type: "text",
      rows: 3,
      validation: (R) => R.max(200),
    },
    {
      name: "coverImage",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", type: "string", title: "Alt text" }],
    },
    {
      name: "body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", type: "string", title: "Alt text" },
            { name: "caption", type: "string" },
          ],
        },
        {
          name: "pullQuote",
          type: "object",
          title: "Pull quote",
          fields: [
            { name: "text", type: "text", rows: 3 },
            { name: "attribution", type: "string" },
          ],
        },
        {
          name: "inlineDonateCta",
          type: "object",
          title: "Inline donate CTA",
          fields: [
            { name: "headline", type: "string" },
            { name: "body", type: "text", rows: 2 },
            { name: "ctaLabel", type: "string" },
          ],
        },
      ],
    },
    {
      name: "tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    },
    {
      name: "featured",
      type: "boolean",
      title: "Surface on home page",
      initialValue: false,
    },
  ],
  preview: {
    select: { title: "title", date: "publishedAt", media: "coverImage" },
    prepare({ title, date }: { title?: string; date?: string }) {
      return {
        title: title ?? "(no title)",
        subtitle: date ? new Date(date).toLocaleDateString("en-CA") : "draft",
      };
    },
  },
} as SchemaTypeDefinition;
