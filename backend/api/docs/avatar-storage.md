# Avatar storage

New avatar uploads use bucket `avatar` with object keys in the form
`<user_id>/<random_uuid>.<extension>`, for example `42/a1b2c3.png`.
The database continues storing the object key in `User.avatar_object_key`.
Profile, leaderboard and game avatar lookups all use the same resolver.

The bucket defaults to `avatar`. Optionally set `AVATAR_R2_BUCKET_NAME` to override
it. Do not change the existing `R2_BUCKET_NAME`, which is still used by course
videos and historical avatars.

Avatar uploads and signed reads use the shared **read/write** credential group:

```dotenv
R2_READ_WRITE_ACCESS_KEY_ID=your-read-write-access-key
R2_READ_WRITE_SECRET_ACCESS_KEY=your-read-write-secret-key
```

This token must grant Object Read & Write on `avatar`. Avatar reads use the same
token because the read-only token is authorized only for content buckets.
Both permission groups share `R2_ACCOUNT_ID` and the optional `R2_ENDPOINT_URL`.
There are no feature-specific credential variables or fallback to old keys.
See [R2 storage configuration](r2-storage.md) for the complete environment setup.

Files in this bucket can remain private: avatar reads use signed URLs.
Historical object keys such as `Avatar/42/old.png` or `avatars/42.png` continue to
be resolved using the old `R2_BUCKET_NAME` and the read-only token. No existing files or
database records are migrated or deleted. Keep read access to the old bucket while
those records are in use. New uploads automatically replace the user's database
reference with a key pointing to the new bucket.

Verification:

```sh
cd backend/api
python -m unittest discover -s tests -p test_avatar_storage.py
python -m unittest discover -s tests -p test_game_avatars.py
```
