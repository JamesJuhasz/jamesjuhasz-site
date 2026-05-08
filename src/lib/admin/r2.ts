/*
  Cloudflare R2 client for admin image uploads.

  R2 is S3-compatible — we use the AWS SDK pointed at the R2 endpoint. The
  bucket is publicly readable through a Cloudflare-routed custom domain
  (R2_PUBLIC_BASE_URL), so we do NOT presign URLs; we just construct
  `${R2_PUBLIC_BASE_URL}/${key}` and store that in the DB.
*/

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedEnv: R2Env | null = null;

function readEnv(): R2Env {
  if (cachedEnv) return cachedEnv;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const missing: string[] = [];
  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("R2_BUCKET");
  if (!publicBaseUrl) missing.push("R2_PUBLIC_BASE_URL");
  if (missing.length > 0) {
    throw new Error(`R2 env vars missing: ${missing.join(", ")}`);
  }
  cachedEnv = {
    accountId: accountId!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    publicBaseUrl: publicBaseUrl!.replace(/\/+$/, ""),
  };
  return cachedEnv;
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const env = readEnv();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return cachedClient;
}

export function getPublicBaseUrl(): string {
  return readEnv().publicBaseUrl;
}

export function getBucket(): string {
  return readEnv().bucket;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Object keys are content-hashed, so bytes for a given key never change.
      // immutable + 1y is honest and lets browsers/CDNs skip revalidation.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getClient();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}
