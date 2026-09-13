import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readSettings } from "@/lib/platform-settings";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  cdnBase: string;
  forcePathStyle: boolean;
};

const KEYS = {
  endpoint: "s3_endpoint",
  region: "s3_region",
  bucket: "s3_bucket",
  accessKey: "s3_access_key",
  secretKey: "s3_secret_key",
  cdnBase: "s3_cdn_base",
  forcePathStyle: "s3_force_path_style",
} as const;

export async function getS3Config(): Promise<S3Config | null> {
  const raw = await readSettings(Object.values(KEYS));
  const bucket = (raw[KEYS.bucket] || process.env.S3_BUCKET || "").trim();
  const accessKey = (raw[KEYS.accessKey] || process.env.S3_ACCESS_KEY || "").trim();
  const secretKey = raw[KEYS.secretKey] || process.env.S3_SECRET_KEY || "";
  if (!bucket || !accessKey || !secretKey) return null;
  const forceRaw = raw[KEYS.forcePathStyle] || process.env.S3_FORCE_PATH_STYLE || "1";
  return {
    endpoint: (raw[KEYS.endpoint] || process.env.S3_ENDPOINT || "").trim(),
    region: (raw[KEYS.region] || process.env.S3_REGION || "auto").trim() || "auto",
    bucket,
    accessKey,
    secretKey,
    cdnBase: (raw[KEYS.cdnBase] || process.env.S3_CDN_BASE || "").trim().replace(/\/+$/, ""),
    forcePathStyle: forceRaw !== "0",
  };
}

export async function s3Configured(): Promise<boolean> {
  return Boolean(await getS3Config());
}

function client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
}

export async function testS3(): Promise<{ ok: boolean; message: string }> {
  const config = await getS3Config();
  if (!config) return { ok: false, message: "Save bucket, access key, and secret first." };
  try {
    await client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
    return { ok: true, message: `Connected to bucket ${config.bucket}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach storage.";
    return { ok: false, message };
  }
}

export async function putObject(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  const config = await getS3Config();
  if (!config) throw new Error("File storage is not configured. Set it in /dashx.");
  await client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ACL: undefined,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const config = await getS3Config();
  if (!config) return;
  await client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function getObjectBytes(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const config = await getS3Config();
  if (!config) return null;
  const res = await client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!res.Body) return null;
  const body = await res.Body.transformToByteArray();
  return { body, contentType: res.ContentType || "application/octet-stream" };
}

/** Short-lived signed GET. Never expose the raw key to unpaid visitors. */
export async function signedGetUrl(key: string, filename: string, seconds = 90): Promise<string> {
  const config = await getS3Config();
  if (!config) throw new Error("File storage is not configured.");
  const url = await getSignedUrl(
    client(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
    }),
    { expiresIn: seconds },
  );
  return url;
}

export function publicObjectUrl(key: string, config: S3Config): string | null {
  if (!config.cdnBase) return null;
  return `${config.cdnBase}/${key.replace(/^\/+/, "")}`;
}

export function objectKey(
  shopId: number,
  productId: number | null,
  fileId: string,
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
  if (!productId) return `shops/${shopId}/media/${fileId}/${safe}`;
  return `shops/${shopId}/products/${productId}/${fileId}/${safe}`;
}
