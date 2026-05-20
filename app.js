const GALLERY_PATH = "./public/gallery.json";

const landingView = document.querySelector("#landing-view");
const portfolioView = document.querySelector("#portfolio-view");
const enterPortfolioButton = document.querySelector("#enter-portfolio");
const backHomeButton = document.querySelector("#back-home");
const albumNavElement = document.querySelector("#album-nav");
const albumTitleElement = document.querySelector("#album-title");
const albumDescriptionElement = document.querySelector("#album-description");
const viewGalleryButton = document.querySelector("#view-gallery");
const viewSlideshowButton = document.querySelector("#view-slideshow");
const galleryViewElement = document.querySelector("#gallery-view");
const slideshowViewElement = document.querySelector("#slideshow-view");
const slideshowImageElement = document.querySelector("#slideshow-image");
const slideCaptionElement = document.querySelector("#slide-caption");
const slideCounterElement = document.querySelector("#slide-counter");
const previousSlideButton = document.querySelector("#slide-prev");
const nextSlideButton = document.querySelector("#slide-next");

let albums = [];
let activeAlbumId = null;
let activeMode = "gallery";
let slideIndex = 0;

function normalizeIndex(index, length) {
  return (index + length) % length;
}

function showPortfolio(isPortfolioVisible) {
  landingView.classList.toggle("is-hidden", isPortfolioVisible);
  portfolioView.classList.toggle("is-hidden", !isPortfolioVisible);
}

function getActiveAlbum() {
  return albums.find((album) => album.id === activeAlbumId) ?? null;
}

function setMode(mode) {
  activeMode = mode;
  viewGalleryButton.classList.toggle("is-active", mode === "gallery");
  viewSlideshowButton.classList.toggle("is-active", mode === "slideshow");
  galleryViewElement.classList.toggle("is-hidden", mode !== "gallery");
  slideshowViewElement.classList.toggle("is-hidden", mode !== "slideshow");

  if (mode === "slideshow") {
    setSlide(slideIndex, 1, false);
  }
}

function setSlide(index, direction = 1, animate = true) {
  const album = getActiveAlbum();
  if (!album || !Array.isArray(album.photos) || album.photos.length === 0) {
    slideCounterElement.textContent = "0 / 0";
    slideCaptionElement.textContent = "";
    slideshowImageElement.removeAttribute("src");
    slideshowImageElement.alt = "";
    return;
  }

  slideIndex = normalizeIndex(index, album.photos.length);
  const photo = album.photos[slideIndex];

  slideshowImageElement.classList.remove("slide-enter-left", "slide-enter-right");
  slideshowImageElement.src = photo.src;
  slideshowImageElement.alt = photo.alt || `${album.title} photo ${slideIndex + 1}`;
  slideCaptionElement.textContent = photo.caption || photo.alt || "";
  slideCounterElement.textContent = `${slideIndex + 1} / ${album.photos.length}`;

  if (animate) {
    void slideshowImageElement.offsetWidth;
    slideshowImageElement.classList.add(direction >= 0 ? "slide-enter-right" : "slide-enter-left");
  }
}

function moveSlide(direction) {
  const album = getActiveAlbum();
  if (!album || !album.photos?.length) {
    return;
  }

  setSlide(slideIndex + direction, direction, true);
}

function renderAlbumNav() {
  albumNavElement.innerHTML = "";

  if (!albums.length) {
    albumNavElement.innerHTML = '<p class="empty-state">No albums found. Add folders under public/photos and run npm run sync:gallery.</p>';
    return;
  }

  for (const album of albums) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "album-link";
    button.classList.toggle("is-active", album.id === activeAlbumId);
    button.textContent = album.title ?? album.id;

    button.addEventListener("click", () => {
      activeAlbumId = album.id;
      slideIndex = 0;
      renderActiveAlbum();
    });

    albumNavElement.append(button);
  }
}

function renderGallery(album) {
  galleryViewElement.innerHTML = "";

  if (!album || !Array.isArray(album.photos) || album.photos.length === 0) {
    galleryViewElement.innerHTML = '<p class="empty-state">This album has no photos yet.</p>';
    return;
  }

  for (const [index, photo] of album.photos.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-item";
    button.setAttribute("aria-label", `Open slideshow at image ${index + 1}`);

    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.alt ?? `${album.title} photo ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";

    button.append(image);
    button.addEventListener("click", () => {
      setMode("slideshow");
      setSlide(index, 1, true);
    });

    galleryViewElement.append(button);
  }
}

function renderActiveAlbum() {
  renderAlbumNav();

  const album = getActiveAlbum();
  if (!album) {
    albumTitleElement.textContent = "Albums";
    albumDescriptionElement.textContent = "Select an album to start.";
    renderGallery(null);
    setSlide(0, 1, false);
    return;
  }

  albumTitleElement.textContent = album.title ?? album.id;
  albumDescriptionElement.textContent =
    album.description || `${album.photos?.length ?? 0} images in this collection.`;

  renderGallery(album);
  setSlide(slideIndex, 1, false);
}

async function loadGallery() {
  try {
    const response = await fetch(GALLERY_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load gallery manifest (${response.status})`);
    }

    const payload = await response.json();
    albums = Array.isArray(payload.albums) ? payload.albums : [];
    activeAlbumId = albums[0]?.id ?? null;
    slideIndex = 0;
  } catch (error) {
    console.error(error);
    albums = [];
    activeAlbumId = null;
  }

  renderActiveAlbum();
}

enterPortfolioButton.addEventListener("click", () => {
  window.location.hash = "portfolio";
  showPortfolio(true);
});

backHomeButton.addEventListener("click", () => {
  history.replaceState(null, "", window.location.pathname);
  showPortfolio(false);
});

viewGalleryButton.addEventListener("click", () => setMode("gallery"));
viewSlideshowButton.addEventListener("click", () => setMode("slideshow"));

previousSlideButton.addEventListener("click", () => moveSlide(-1));
nextSlideButton.addEventListener("click", () => moveSlide(1));

slideshowImageElement.addEventListener("animationend", () => {
  slideshowImageElement.classList.remove("slide-enter-left", "slide-enter-right");
});

document.addEventListener("keydown", (event) => {
  const inPortfolio = !portfolioView.classList.contains("is-hidden");
  if (!inPortfolio) {
    return;
  }

  if (event.key === "ArrowRight" && activeMode === "slideshow") {
    event.preventDefault();
    moveSlide(1);
  }

  if (event.key === "ArrowLeft" && activeMode === "slideshow") {
    event.preventDefault();
    moveSlide(-1);
  }

  if (event.key.toLowerCase() === "g") {
    setMode("gallery");
  }

  if (event.key.toLowerCase() === "s") {
    setMode("slideshow");
  }

  if (event.key === "Escape" && activeMode === "slideshow") {
    setMode("gallery");
  }
});

window.addEventListener("hashchange", () => {
  showPortfolio(window.location.hash === "#portfolio");
});

showPortfolio(window.location.hash === "#portfolio");
setMode("gallery");
loadGallery();
