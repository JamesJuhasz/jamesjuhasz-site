/*
  GROQ queries used by Next.js routes. All callers should go through
  `fetchSanity` (queries.ts has the GROQ; src/sanity/fetch.ts has the wrapper
  with seed-data fallback when Sanity isn't configured).
*/

export const POSTS_INDEX = /* groq */ `
  *[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    "slug": slug.current,
    title,
    excerpt,
    publishedAt,
    coverImage { asset->{url, metadata}, alt },
    tags,
    featured
  }
`;

export const POST_BY_SLUG = /* groq */ `
  *[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    "slug": slug.current,
    title,
    excerpt,
    publishedAt,
    coverImage { asset->{url, metadata}, alt },
    body,
    tags,
    featured,
    "previous": *[_type == "post" && publishedAt < ^.publishedAt && !(_id in path("drafts.**"))] | order(publishedAt desc)[0] {
      title, "slug": slug.current
    },
    "next": *[_type == "post" && publishedAt > ^.publishedAt && !(_id in path("drafts.**"))] | order(publishedAt asc)[0] {
      title, "slug": slug.current
    }
  }
`;

export const FEATURED_POSTS = /* groq */ `
  *[_type == "post" && featured == true && !(_id in path("drafts.**"))] | order(publishedAt desc)[0...3] {
    "slug": slug.current,
    title,
    excerpt,
    publishedAt,
    coverImage { asset->{url}, alt }
  }
`;

export const EVENTS_INDEX = /* groq */ `
  *[_type == "event" && !(_id in path("drafts.**"))] | order(eventDate desc) {
    "slug": slug.current,
    title,
    eventDate,
    endDate,
    location,
    category,
    resultPosition,
    coverImage { asset->{url}, alt },
    upcoming
  }
`;

export const EVENT_BY_SLUG = /* groq */ `
  *[_type == "event" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    "slug": slug.current,
    title,
    eventDate,
    endDate,
    location,
    category,
    resultPosition,
    coverImage { asset->{url, metadata}, alt },
    body,
    upcoming,
    "relatedPosts": relatedPosts[]->{ "slug": slug.current, title, publishedAt }
  }
`;

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
