# R2 credentials by access level

Configure exactly two S3 credential pairs in the backend environment. Both use
the same Cloudflare account and optional endpoint:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id

R2_READ_ONLY_ACCESS_KEY_ID=your-read-only-access-key
R2_READ_ONLY_SECRET_ACCESS_KEY=your-read-only-secret-key

R2_READ_WRITE_ACCESS_KEY_ID=your-read-write-access-key
R2_READ_WRITE_SECRET_ACCESS_KEY=your-read-write-secret-key

R2_BUCKET_NAME=dbt-learning
GAME_MEDIA_R2_BUCKET_NAME=dbt-game
AVATAR_R2_BUCKET_NAME=avatar
```

The **read-only** token is authorized for `dbt-chat`, `dbt-game` and `dbt-learning`.
It handles knowledge reads, game media listing/reads, course video signed URLs
and historical avatars still stored in a content bucket.

The **read/write** token is authorized only for `avatar`. It handles new avatar
uploads and signed avatar reads. Reading an avatar must use this token too,
because the read-only token has no access to the avatar bucket. New object keys
remain `<user_id>/<random_uuid>.<extension>`.

`R2_BUCKET_NAME` selects the course video and historical avatar bucket. The other
two bucket variables are optional and default to `dbt-game` and `avatar`.
Knowledge defaults to `dbt-chat` and still supports `WUKOO_KNOWLEDGE_BUCKET`.
Bucket variables select storage locations, not credentials.

Optional `R2_ENDPOINT_URL` overrides the shared endpoint, for example for an R2
jurisdiction. Otherwise the endpoint is derived from `R2_ACCOUNT_ID`.
Optional `GAME_MEDIA_PUBLIC_BASE_URL` enables public game media delivery; without
it, the read-only client signs private media URLs.

## Update an existing deployment

Replace `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`,
`GAME_MEDIA_R2_ACCESS_KEY_ID` / `GAME_MEDIA_R2_SECRET_ACCESS_KEY` and
`AVATAR_R2_ACCESS_KEY_ID` / `AVATAR_R2_SECRET_ACCESS_KEY` with the two shared groups
above. Feature-specific account/endpoint overrides are also no longer read.
The old variables do not provide a fallback: a missing credential fails in that
permission group, without silently using a more privileged or unrelated token.

Keep `R2_ACCOUNT_ID` and the bucket settings. Put real values only in server-side
environment/secrets, never in frontend variables or version control. For local
Python execution, use `backend/api/.env`. Both Compose files forward the new
variables from the shell, root Compose `.env`, or `docker compose --env-file`.
Restart or recreate the backend after updating credentials; S3 clients are cached
per process. No database migration or object migration is required.

## Verification

```sh
cd backend/api
python -m unittest discover -s tests -p 'test_*storage.py'
python -m unittest discover -s tests -p test_game_media.py
python -m unittest discover -s tests -p test_game_avatars.py
```
