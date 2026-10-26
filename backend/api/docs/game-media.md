# Game detail media

The portal discovers files from the `dbt-game` R2 bucket. No `media.json` is required.
The authenticated endpoint is `GET /api/games/{game_slug}/media`.
The shared game detail introduction uses text only, without decorative game
illustrations. Screenshots and tutorial thumbnails belong in their media sections.

## Storage layout

```text
dbt-game/
  freefall-chess/
    preview/
      01-overview.webp
      02-level.png
    video-tutorial/
      01-basics.mp4
      02-advanced.mp4
  fogchess/
    preview/
    video-tutorial/
```

Each detail URL uses its slug as the storage prefix. The public Freefall Chess
slug is `freefall-chess`; the launch, likes and other legacy API identifiers stay
`chessmater`. All other prefixes match the existing game keys, including underscores.
See `config/game_media.py` for the server allowlist and
`frontend/main_page/config/brain-games.ts` for the visible game catalog.

Images: JPG, JPEG, PNG, WebP, AVIF and GIF. Tutorials: MP4, WebM and OGV.
Use MP4 with H.264 video and AAC audio for broad browser support. Export MP4s
with the metadata at the beginning of the file (fast start). Upload with the correct
Content-Type, such as `image/webp` or `video/mp4`, and without an attachment
Content-Disposition. Empty files, folder markers, hidden files and unrelated
formats are ignored. Subfolders are scanned recursively. Files are sorted naturally
by their full path, so `2.webp` precedes `10.webp`; leading numeric filenames
provide predictable ordering. Filenames and paths are case-sensitive.

## Server environment

Use the shared R2 **Object Read only** token authorized for `dbt-chat`, `dbt-game`
and `dbt-learning`. It must allow listing and reading objects. Set these variables in the backend
environment (`backend/api/.env` when running locally):

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_READ_ONLY_ACCESS_KEY_ID=your-read-only-access-key
R2_READ_ONLY_SECRET_ACCESS_KEY=your-read-only-secret-key
GAME_MEDIA_R2_BUCKET_NAME=dbt-game
GAME_MEDIA_PUBLIC_BASE_URL=https://your-game-media-domain.example
```

`GAME_MEDIA_PUBLIC_BASE_URL` is optional. With it, files load directly from the
public domain connected to the bucket; do not include `/dbt-game` in the URL.
Without it, the backend returns six-hour presigned GET URLs and the bucket may
remain private. Signed URLs use the S3 endpoint, not the custom domain.

An optional shared `R2_ENDPOINT_URL` overrides the standard account endpoint,
for example when using a jurisdiction-specific R2 endpoint.

The game bucket never falls back to `R2_BUCKET_NAME`: its default is always
`dbt-game`. Credentials are configured by access level, not by feature. The old
`GAME_MEDIA_R2_*` credential variables are no longer read. Bucket and public URL
settings remain feature-specific. See [R2 storage configuration](r2-storage.md).
Never set these credentials in frontend variables or commit real values.
Restart the backend after changing its environment.

Both Compose files pass the shared `R2_*` and media settings to the backend container.
Set them in the shell, a root Compose `.env`, or a file selected with
`docker compose --env-file path/to/your-env up`. Do not print or commit secret values.

## Browser access and caching

For public delivery, connect a production custom domain to `dbt-game` in Cloudflare.
The `r2.dev` development URL is suitable only for testing. Only put public game
marketing assets in a publicly exposed bucket.

If browser fetches or cross-origin media processing are needed, configure bucket
CORS for your actual portal origins, for example:

```json
[
  {
    "AllowedOrigins": ["https://your-portal.example", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

The backend paginates both folders and caches file keys for five minutes per game
per process. New uploads and deletions appear after that cache expires and the
page is refreshed or revisited. Failed scans are not cached. Signed URLs are
generated fresh on each request; the JSON response is `private, no-store`.
For long-open pages using signed URLs, reload the page if playback links expire.
For public delivery, use versioned filenames when replacing cached content and
configure appropriate Cloudflare cache rules and object Cache-Control headers.

Screenshots appear in a single horizontal row, with three full cards on wide
containers, two on medium containers and one on narrow containers. When more
screenshots exist, 20% of the next card is revealed. Arrows move one card at a time
and disappear at the corresponding boundary. Touch/trackpad scrolling and arrow
keys are supported; selecting a card still opens the full image gallery.
A draggable horizontal scrollbar appears when the preview row is clicked,
scrolled or focused. It stays visible during dragging and fades after 1.5 seconds
of inactivity, with keyboard focus and reduced-motion support.
The frontend lazily loads screenshots. Tutorials appear as compact thumbnails
without visible numbered captions; metadata and the first video frame are loaded
for each thumbnail. Clicking a thumbnail opens a larger player in a modal and
starts playback. Closing the modal removes the player and stops playback.
Empty folders, storage errors and playback errors have localized states. Storage
availability never blocks the Play Now button.

## Deliberately pending game data

Likes and launches use existing APIs. No new database migration is required.
Achievements use the twenty original raster Figma badges; there are no native
vector badge layers in the supplied design. Their translated requirements are
displayed as a catalog, without fabricated unlocks or progress. Other games show
an empty achievement catalog until configured. Game-specific leaderboards and
ratings have no data source in this portal yet; the leaderboard shows an empty
state and ratings are omitted. The Friends Who Play section is omitted.

## Verification

```sh
cd backend/api
python -m unittest discover -s tests -p test_game_media.py
cd ../../frontend/main_page
npx tsc --noEmit --incremental false
```
