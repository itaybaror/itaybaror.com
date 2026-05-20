import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const photosRoot = path.join(root, "public", "photos");
const outputFile = path.join(root, "public", "gallery.json");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const publicPhotosPrefix = "public/photos";

function toPublicPhotoPath(albumId, fileName) {
  return `./${path.posix.join(publicPhotosPrefix, albumId, fileName)}`;
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_ ]+/g)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalMetadata(albumPath) {
  const metadataPath = path.join(albumPath, "album.json");
  if (!(await fileExists(metadataPath))) {
    return {};
  }

  const content = await fs.readFile(metadataPath, "utf8");
  return JSON.parse(content);
}

async function readAlbums() {
  if (!(await fileExists(photosRoot))) {
    return [];
  }

  const entries = await fs.readdir(photosRoot, { withFileTypes: true });
  const albumDirectories = entries.filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith(".")
  );

  const albums = [];

  for (const entry of albumDirectories) {
    const albumId = entry.name;
    const albumPath = path.join(photosRoot, albumId);
    const metadata = await readOptionalMetadata(albumPath);
    const files = await fs.readdir(albumPath, { withFileTypes: true });

    const photos = files
      .filter((fileEntry) => {
        if (!fileEntry.isFile() || fileEntry.name.startsWith(".")) {
          return false;
        }
        const ext = path.extname(fileEntry.name).toLowerCase();
        return imageExtensions.has(ext);
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((fileEntry, index) => {
        const altPrefix = metadata.title ?? titleFromSlug(albumId);
        const baseAlt = metadata.altPrefix ?? altPrefix;
        return {
          src: toPublicPhotoPath(albumId, fileEntry.name),
          alt: `${baseAlt} ${index + 1}`,
          caption: "",
        };
      });

    albums.push({
      id: albumId,
      title: metadata.title ?? titleFromSlug(albumId),
      description: metadata.description ?? "",
      order: Number.isFinite(metadata.order) ? metadata.order : 9999,
      cover: metadata.cover
        ? toPublicPhotoPath(albumId, metadata.cover)
        : photos[0]?.src ?? "",
      photos,
    });
  }

  return albums.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

async function writeManifest() {
  const albums = await readAlbums();
  const manifest = {
    generatedAt: new Date().toISOString(),
    albums: albums.map((album) => {
      const { order, ...albumForOutput } = album;
      return albumForOutput;
    }),
  };

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Synced ${albums.length} album(s) to public/gallery.json`);
}

writeManifest().catch((error) => {
  console.error("Failed to sync gallery:", error);
  process.exitCode = 1;
});
