import type { SchemaTypeDefinition } from "sanity";

export const supporterSchema: SchemaTypeDefinition = {
  name: "supporter",
  title: "Supporter / Sponsor",
  type: "document",
  fields: [
    { name: "name", type: "string", validation: (R) => R.required() },
    {
      name: "logo",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", type: "string", title: "Alt text" }],
    },
    {
      name: "tier",
      type: "string",
      options: {
        list: ["Foundation", "Major", "Sustaining"],
        layout: "radio",
      },
      validation: (R) => R.required(),
    },
    {
      name: "websiteUrl",
      type: "url",
    },
    {
      name: "displayOrder",
      type: "number",
      initialValue: 0,
    },
    {
      name: "showOnHome",
      type: "boolean",
      initialValue: true,
    },
  ],
  preview: {
    select: { title: "name", tier: "tier", media: "logo" },
    prepare({ title, tier }: { title?: string; tier?: string }) {
      return {
        title: title ?? "(no name)",
        subtitle: tier ?? "—",
      };
    },
  },
} as SchemaTypeDefinition;
