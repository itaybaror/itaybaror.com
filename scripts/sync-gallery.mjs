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

function readPngDimensions(buffer) {
  const isPng =
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  if (!isPng) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readGifDimensions(buffer) {
  const signature = buffer.subarray(0, 6).toString("ascii");
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    return null;
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  return null;
}

async function readImageDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  return readJpegDimensions(buffer) ?? readPngDimensions(buffer) ?? readGifDimensions(buffer);
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

    const imageFiles = files
      .filter((fileEntry) => {
        if (!fileEntry.isFile() || fileEntry.name.startsWith(".")) {
          return false;
        }
        const ext = path.extname(fileEntry.name).toLowerCase();
        return imageExtensions.has(ext);
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const photos = [];
    for (const [index, fileEntry] of imageFiles.entries()) {
      const altPrefix = metadata.title ?? titleFromSlug(albumId);
      const baseAlt = metadata.altPrefix ?? altPrefix;
      const dimensions = await readImageDimensions(path.join(albumPath, fileEntry.name));
      photos.push({
        src: toPublicPhotoPath(albumId, fileEntry.name),
        alt: `${baseAlt} ${index + 1}`,
        caption: "",
        ...(dimensions ?? {}),
      });
    }

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
