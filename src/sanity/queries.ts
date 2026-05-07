/*
  GROQ queries for Sanity-backed reference content (press, supporters,
  giving levels). Newsletters and events live in Postgres now — see
  src/lib/posts.ts and src/lib/events.ts.
*/

export const PRESS_MENTIONS = /* groq */ `
  *[_type == "pressMention" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    publication,
    articleTitle,
    publishedAt,
    externalUrl,
    excerpt,
    logo { asset->{url}, alt }
  }
`;

export const SUPPORTERS = /* groq */ `
  *[_type == "supporter" && !(_id in path("drafts.**"))] | order(displayOrder asc) {
    name,
    websiteUrl,
    logo { asset->{url}, alt },
    tier,
    showOnHome
  }
`;

export const GIVING_LEVELS = /* groq */ `
  *[_type == "givingLevel" && !(_id in path("drafts.**"))] | order(amount asc) {
    amount,
    label,
    outcome,
    displayOrder
  }
`;
