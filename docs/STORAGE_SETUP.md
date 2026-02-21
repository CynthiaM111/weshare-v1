# File Storage Setup for Production

## Why Cloud Storage?

On Netlify, Vercel, and other serverless platforms, the filesystem is **read-only**. You cannot create the `storage/` directory or write files locally. Uploads fail with:

```
ENOENT: no such file or directory, mkdir '/var/task/storage'
```

**Solution:** Use S3-compatible cloud storage (AWS S3 or Cloudflare R2) for production.

---

## Option 1: Cloudflare R2 (Recommended – Free Tier)

1. Create a [Cloudflare account](https://cloudflare.com)
2. Go to **R2 Object Storage** → **Create bucket** (e.g. `weshare-uploads`)
3. Go to **R2** → **Manage R2 API Tokens** → **Create API Token**
4. Add these to your Netlify **Environment Variables**:

| Variable | Value |
|----------|-------|
| `MY_S3_BUCKET` | Your bucket name (e.g. `weshare-uploads`) |
| `MY_S3_REGION` | `auto` |
| `MY_S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (find Account ID in R2 overview) |
| `MY_AWS_ACCESS_KEY_ID` | R2 API Token Access Key ID |
| `MY_AWS_SECRET_ACCESS_KEY` | R2 API Token Secret Access Key |

---

## Option 2: AWS S3

1. Create an [AWS S3 bucket](https://console.aws.amazon.com/s3)
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:HeadObject` permissions
3. Add to Netlify **Environment Variables**:

| Variable | Value |
|----------|-------|
| `MY_S3_BUCKET` | Your bucket name |
| `MY_S3_REGION` | e.g. `us-east-1` |
| `MY_AWS_ACCESS_KEY_ID` | IAM access key |
| `MY_AWS_SECRET_ACCESS_KEY` | IAM secret key |

(Do **not** set `MY_S3_ENDPOINT` for AWS S3 – it uses the default endpoint.)

---

## Local Development

When S3 is **not** configured (no `MY_S3_BUCKET`), the app uses the local `storage/` folder. No setup needed for local dev.

---

## Install Dependencies

Run `npm install` to add `@aws-sdk/client-s3` (already in `package.json`).
