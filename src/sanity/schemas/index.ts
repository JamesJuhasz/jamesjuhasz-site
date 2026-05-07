import type { SchemaTypeDefinition } from "sanity";
import { pressMentionSchema } from "./pressMention";
import { supporterSchema } from "./supporter";
import { givingLevelSchema } from "./givingLevel";

// Newsletters and events are now in Postgres (managed via /admin).
// Press, supporters, and giving levels remain in Sanity for now.
export const schemaTypes: SchemaTypeDefinition[] = [
  pressMentionSchema,
  supporterSchema,
  givingLevelSchema,
];
