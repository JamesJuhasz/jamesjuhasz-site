import type { SchemaTypeDefinition } from "sanity";

export const eventSchema: SchemaTypeDefinition = {
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    { name: "title", type: "string", validation: (R) => R.required() },
    {
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (R) => R.required(),
    },
    {
      name: "eventDate",
      type: "date",
      title: "Start date",
      validation: (R) => R.required(),
    },
    { name: "endDate", type: "date", title: "End date (optional)" },
    {
      name: "location",
      type: "string",
      validation: (R) => R.required(),
    },
    {
      name: "category",
      type: "string",
      options: {
        list: ["Regatta", "Training", "Coaching"],
        layout: "radio",
      },
      validation: (R) => R.required(),
    },
    { name: "resultPosition", type: "string", title: "Result (e.g. '12th')" },
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
      ],
    },
    {
      name: "relatedPosts",
      type: "array",
      of: [{ type: "reference", to: [{ type: "post" }] }],
    },
    {
      name: "upcoming",
      type: "boolean",
      title: "Upcoming",
      initialValue: false,
      description:
        "Toggle on for upcoming events. Display logic also auto-derives from date.",
    },
  ],
  preview: {
    select: { title: "title", date: "eventDate", category: "category" },
    prepare({
      title,
      date,
      category,
    }: {
      title?: string;
      date?: string;
      category?: string;
    }) {
      return {
        title: title ?? "(no title)",
        subtitle: `${category ?? "?"} · ${date ?? "no date"}`,
      };
    },
  },
} as SchemaTypeDefinition;
