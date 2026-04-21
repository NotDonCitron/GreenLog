# CannaLOG VPS Image Infrastructure

CannaLOG serves public images through same-origin app URLs while storing objects in VPS MinIO.

## Runtime URLs

- App: `https://green-log-two.vercel.app`
- Public media path: `/media/<bucket>/<key>`
- Example test URL: `https://green-log-two.vercel.app/media/strains/<known-key>.webp`

## Required Vercel Environment Variables

All MinIO variables are server-only. Do not prefix them with `NEXT_PUBLIC_`.

```bash
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=<minio-access-key>
MINIO_SECRET_KEY=<minio-secret-key>
MINIO_REGION=eu-central-1
MINIO_FORCE_PATH_STYLE=true
MINIO_PUBLIC_MODE=same-origin
IMAGE_PUBLIC_BASE_PATH=/media
```

## Buckets

Public through CannaLOG `/media` route:

- `strains`
- `user-strains`
- `avatars`
- `org-logos`

Private:

- `grow-entry-photos`

## VPS Gate

VPS changes are blocked until SSH works non-interactively. Last observed status: `ssh root@31.97.77.89` denied access.

Before production cutover, verify on the VPS:

```bash
ssh root@31.97.77.89 'ss -ltnp | egrep ":(9000|9001|80|443)" || true'
ssh root@31.97.77.89 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}" || true'
```

## Migration

Dry-run first:

```bash
npm run images:migrate -- --limit=25 --table=strains
```

Apply only after the dry-run report is clean:

```bash
npm run images:migrate:apply -- --limit=25 --table=strains
```

Reports are written to `scripts/image-migration-reports/` and contain old URL, new URL, bucket, key, byte size, content type, and failure reason.

## Rollback

The migration does not delete Supabase/external source images. To rollback a batch, restore image columns from the generated report's `oldUrl` values.

## Verification Checklist

- `/media/strains/<known-key>` returns `200`, correct `Content-Type`, and `Cache-Control`.
- Strain detail page renders migrated strain images without CSP errors.
- Admin strain image upload writes `/media/strains/...` to `strains.image_url`.
- User collection image upload writes `/media/user-strains/...` to `user_collection.user_image_url`.
- Avatar upload writes `/media/avatars/...` to `profiles.avatar_url`.
- Org logo upload writes `/media/org-logos/...` to `organizations.logo_url`.
- Grow photo upload still returns a signed private URL.
