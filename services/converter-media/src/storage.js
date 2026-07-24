import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';

let client = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
    });
  }
  return client;
}

export function randomStorageKey(prefix = 'artifacts') {
  const id = crypto.randomBytes(16).toString('hex');
  const shard = id.slice(0, 2);
  return `${prefix}/${shard}/${id}`;
}

export async function putObject(key, body, contentType) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getObjectStream(key) {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }),
  );
  return res.Body;
}

export async function deleteObject(key) {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }),
    );
  } catch {
    // best-effort cleanup
  }
}

export async function headObject(key) {
  try {
    return await getClient().send(
      new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }),
    );
  } catch {
    return null;
  }
}

/** Presigned GET URL (default 5 minutes). */
export async function signedGetUrl(key, ttlMs = config.signedDownloadTtlMs) {
  const command = new GetObjectCommand({ Bucket: config.s3.bucket, Key: key });
  const url = await getSignedUrl(getClient(), command, { expiresIn: Math.floor(ttlMs / 1000) });

  // Rewrite host to public endpoint when configured
  const internal = new URL(config.s3.endpoint);
  const pub = new URL(config.s3.publicEndpoint);
  return url.replace(`${internal.protocol}//${internal.host}`, `${pub.protocol}//${pub.host}`);
}

/** Presigned PUT for AI temp uploads (short TTL). */
export async function signedPutUrl(key, contentType, ttlMs = 5 * 60 * 1000) {
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  const url = await getSignedUrl(getClient(), command, { expiresIn: Math.floor(ttlMs / 1000) });
  const internal = new URL(config.s3.endpoint);
  const pub = new URL(config.s3.publicEndpoint);
  return url.replace(`${internal.protocol}//${internal.host}`, `${pub.protocol}//${pub.host}`);
}

/**
 * Lifecycle notes (see scripts/lifecycle-bucket.json):
 * - Abort incomplete multipart uploads after 1 day
 * - Expire scratch prefix after 7 days
 * - Transition artifacts/ to infrequent after 30 days (optional)
 */
