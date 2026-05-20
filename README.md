# Photography Site

Photography portfolio with:

- a custom recreated landing scene with a centered white panel and `enter` button
- a reference-inspired portfolio layout (left navigation rail + right masonry image wall)
- two album viewing modes (`gallery` and `slideshow`)

## Run locally

```bash
npm run dev
```

Open: `http://localhost:4173`

## Controls

- `Enter` button: open the portfolio page
- Album links (left sidebar): switch albums
- `GALLERY VIEW` / `SLIDESHOW VIEW`: switch viewing mode
- Slideshow keyboard:
  - `ArrowRight` next image
  - `ArrowLeft` previous image
  - `Esc` back to gallery

## Add albums and photos (no code changes)

1. Create a folder under `public/photos/` (album id), for example `public/photos/venice-2026`.
2. Drop image files into that folder (`jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`).
3. Optional: add `public/photos/venice-2026/album.json` to control title/order/cover.
4. Regenerate `public/gallery.json`:

```bash
npm run sync:gallery
```

Refresh the page and the new album appears automatically.

## Optional `album.json` format

```json
{
  "title": "Venice 2026",
  "description": "Misty morning canals and street portraits.",
  "order": 1,
  "cover": "IMG_0001.jpg",
  "altPrefix": "Venice"
}
```
