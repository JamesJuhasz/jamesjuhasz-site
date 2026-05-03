import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, readToken } from "./env";

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published",
    })
  : null;

export const sanityClientPreview = projectId && readToken
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token: readToken,
      perspective: "drafts",
    })
  : null;
