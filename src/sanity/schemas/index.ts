import type { SchemaTypeDefinition } from "sanity";
import { postSchema } from "./post";
import { eventSchema } from "./event";
import { pressMentionSchema } from "./pressMention";
import { supporterSchema } from "./supporter";
import { givingLevelSchema } from "./givingLevel";

export const schemaTypes: SchemaTypeDefinition[] = [
  postSchema,
  eventSchema,
  pressMentionSchema,
  supporterSchema,
  givingLevelSchema,
];
