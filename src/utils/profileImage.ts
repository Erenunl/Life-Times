import type { ProfileImage } from "../types/game";

const PROFILE_IMAGE_SIZE = 512;
export const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;
export const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProfileImageMimeType = (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number];

export function isSupportedProfileImageType(type: string): type is ProfileImageMimeType {
  return ALLOWED_PROFILE_IMAGE_TYPES.includes(type as ProfileImageMimeType);
}

export async function processProfileImage(file: File): Promise<ProfileImage> {
  if (!isSupportedProfileImageType(file.type)) {
    throw new Error("Use a JPEG, PNG, or WebP image.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile photo must be 3 MB or smaller.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not process this image in the browser.");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    PROFILE_IMAGE_SIZE,
    PROFILE_IMAGE_SIZE,
  );

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    mimeType: "image/jpeg",
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be read."));
    };

    image.src = url;
  });
}
