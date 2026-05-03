import type { SchemaTypeDefinition } from "sanity";

export const givingLevelSchema: SchemaTypeDefinition = {
  name: "givingLevel",
  title: "Giving level",
  type: "document",
  fields: [
    {
      name: "amount",
      type: "number",
      validation: (R) => R.required().positive(),
    },
    {
      name: "label",
      type: "string",
      validation: (R) => R.required(),
    },
    {
      name: "outcome",
      type: "text",
      rows: 2,
      validation: (R) => R.required(),
    },
    {
      name: "displayOrder",
      type: "number",
      initialValue: 0,
    },
  ],
  preview: {
    select: { amount: "amount", label: "label" },
    prepare({ amount, label }: { amount?: number; label?: string }) {
      return {
        title: `$${amount} — ${label ?? ""}`,
        subtitle: "",
      };
    },
  },
} as SchemaTypeDefinition;
