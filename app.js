const GALLERY_PATH = "./public/gallery.json";
const LANDING_BACKGROUND_INTERVAL = 8000;
const LANDING_ENTER_ANIMATION_DURATION = 900;

const landingView = document.querySelector("#landing-view");
const landingBackgroundElements = [...document.querySelectorAll(".landing-photo-bg")];
const portfolioView = document.querySelector("#portfolio-view");
const enterPortfolioButton = document.querySelector("#enter-portfolio");
const backHomeButton = document.querySelector("#back-home");
const albumNavElement = document.querySelector("#album-nav");
const albumTitleElement = document.querySelector("#album-title");
const albumDescriptionElement = document.querySelector("#album-description");
const toggleSidebarButton = document.querySelector("#toggle-sidebar");
const revealSidebarButton = document.querySelector("#reveal-sidebar");
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
let sidebarHidden = false;
let landingBackgroundIndex = 0;
let landingBackgroundTimer = null;
let landingPhotoPool = [];
let isEnteringPortfolio = false;

function normalizeIndex(index, length) {
  return (index + length) % length;
}

function showPortfolio(isPortfolioVisible) {
  landingView.classList.toggle("is-hidden", isPortfolioVisible);
  portfolioView.classList.toggle("is-hidden", !isPortfolioVisible);
}

function setSidebarVisibility(isHidden) {
  sidebarHidden = isHidden;
  portfolioView.classList.toggle("sidebar-hidden", isHidden);
  toggleSidebarButton.textContent = isHidden ? "›" : "‹";
  toggleSidebarButton.setAttribute("aria-label", isHidden ? "Show menu" : "Hide menu");
  toggleSidebarButton.setAttribute("aria-pressed", String(isHidden));
  revealSidebarButton.classList.toggle("is-visible", isHidden);
}

function getActiveAlbum() {
  return albums.find((album) => album.id === activeAlbumId) ?? null;
}

function getAllGalleryPhotos() {
  return albums.flatMap((album) =>
    Array.isArray(album.photos) ? album.photos.filter((photo) => typeof photo.src === "string" && photo.src) : [],
  );
}

function getRandomPhoto(excludedPhoto = null) {
  if (!landingPhotoPool.length) {
    return null;
  }

  if (landingPhotoPool.length === 1) {
    return landingPhotoPool[0];
  }

  let nextPhoto = landingPhotoPool[Math.floor(Math.random() * landingPhotoPool.length)];
  while (nextPhoto.src === excludedPhoto?.src) {
    nextPhoto = landingPhotoPool[Math.floor(Math.random() * landingPhotoPool.length)];
  }

  return nextPhoto;
}

function setLandingBackground(photo) {
  if (!photo || landingBackgroundElements.length < 2) {
    return;
  }

  landingBackgroundIndex = (landingBackgroundIndex + 1) % landingBackgroundElements.length;
  const activeElement = landingBackgroundElements[landingBackgroundIndex];

  activeElement.style.setProperty("--landing-photo", `url("${photo.src}")`);
  for (const element of landingBackgroundElements) {
    element.classList.toggle("is-active", element === activeElement);
  }
}

function startLandingBackgroundRotation() {
  landingPhotoPool = getAllGalleryPhotos();
  if (!landingPhotoPool.length || landingBackgroundElements.length < 2) {
    return;
  }

  const firstPhoto = getRandomPhoto();
  landingBackgroundElements[landingBackgroundIndex].style.setProperty("--landing-photo", `url("${firstPhoto.src}")`);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  landingBackgroundTimer = window.setInterval(() => {
    const currentPhoto = landingPhotoPool.find(
      (photo) => landingBackgroundElements[landingBackgroundIndex].style.getPropertyValue("--landing-photo").includes(photo.src),
    );
    setLandingBackground(getRandomPhoto(currentPhoto));
  }, LANDING_BACKGROUND_INTERVAL);
}

function setMode(mode) {
  activeMode = mode;
  portfolioView.classList.toggle("slideshow-mode", mode === "slideshow");
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

function getGalleryPhotoLabel(photo, index) {
  if (photo.caption && photo.caption.trim()) {
    return photo.caption.trim();
  }

  const source = photo.src ?? "";
  const fileName = decodeURIComponent(source.split("/").pop() ?? "");
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  if (nameWithoutExtension) {
    return nameWithoutExtension;
  }

  return `Image ${index + 1}`;
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

    const label = document.createElement("span");
    label.className = "gallery-item-label";
    label.textContent = getGalleryPhotoLabel(photo, index);

    button.append(image);
    button.append(label);
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
  const imageCount = album.photos?.length ?? 0;
  albumDescriptionElement.textContent = `${imageCount} image${imageCount === 1 ? "" : "s"} in this collection.`;

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
  window.clearInterval(landingBackgroundTimer);
  startLandingBackgroundRotation();
}

enterPortfolioButton.addEventListener("click", () => {
  if (isEnteringPortfolio) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.hash = "portfolio";
    showPortfolio(true);
    return;
  }

  isEnteringPortfolio = true;
  landingView.classList.add("is-entering");
  enterPortfolioButton.disabled = true;

  window.setTimeout(() => {
    window.location.hash = "portfolio";
    showPortfolio(true);
    landingView.classList.remove("is-entering");
    enterPortfolioButton.disabled = false;
    isEnteringPortfolio = false;
  }, LANDING_ENTER_ANIMATION_DURATION);
});

backHomeButton.addEventListener("click", () => {
  history.replaceState(null, "", window.location.pathname);
  showPortfolio(false);
});

viewGalleryButton.addEventListener("click", () => setMode("gallery"));
viewSlideshowButton.addEventListener("click", () => setMode("slideshow"));
toggleSidebarButton.addEventListener("click", () => setSidebarVisibility(!sidebarHidden));
revealSidebarButton.addEventListener("click", () => setSidebarVisibility(false));

previousSlideButton.addEventListener("click", () => moveSlide(-1));
nextSlideButton.addEventListener("click", () => moveSlide(1));

enterPortfolioButton.addEventListener("pointermove", (event) => {
  const bounds = enterPortfolioButton.getBoundingClientRect();
  const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
  const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;

  enterPortfolioButton.classList.add("is-pointer-active");
  enterPortfolioButton.style.setProperty("--pointer-x", `${pointerX}%`);
  enterPortfolioButton.style.setProperty("--pointer-y", `${pointerY}%`);
});

enterPortfolioButton.addEventListener("pointerleave", () => {
  enterPortfolioButton.classList.remove("is-pointer-active");
  enterPortfolioButton.style.setProperty("--pointer-x", "50%");
  enterPortfolioButton.style.setProperty("--pointer-y", "50%");
});

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

  if (event.key.toLowerCase() === "m") {
    setSidebarVisibility(!sidebarHidden);
  }
});

window.addEventListener("hashchange", () => {
  showPortfolio(window.location.hash === "#portfolio");
});

showPortfolio(window.location.hash === "#portfolio");
setMode("gallery");
setSidebarVisibility(false);
loadGallery();
