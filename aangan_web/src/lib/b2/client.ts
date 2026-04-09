import { S3Client } from '@aws-sdk/client-s3';

const B2_KEY_ID = process.env.B2_KEY_ID!;
const B2_APP_KEY = process.env.B2_APP_KEY!;
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'us-east-005';

export const b2Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APP_KEY,
  },
});

export const B2_BUCKET = process.env.B2_BUCKET || 'aangan-media';
export const B2_CDN_URL = process.env.NEXT_PUBLIC_B2_CDN_URL || 'https://media.aangan.app';
