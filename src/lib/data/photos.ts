import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { PHOTO_MAX_UPLOAD_BYTES } from "@/lib/validation/player";
import { DataError } from "./errors";

export const PHOTO_BUCKET = "player-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_DIMENSION = 1024;

/**
 * Verkleinert ein Foto im Browser (max. 1024 px, WebP/JPEG) – spart Speicher und
 * entfernt dabei Metadaten wie GPS-Koordinaten aus dem Originalbild.
 */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new DataError("Das Bild konnte nicht gelesen werden.");
  });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new DataError("Das Bild konnte nicht verarbeitet werden.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, 0.85));
  const blob = (await toBlob("image/webp")) ?? (await toBlob("image/jpeg"));
  if (!blob) throw new DataError("Das Bild konnte nicht verarbeitet werden.");
  if (blob.size > PHOTO_MAX_UPLOAD_BYTES) throw new DataError("Das Bild ist auch nach dem Verkleinern zu groß.");
  return blob;
}

function extensionFor(type: string): string {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  return "jpg";
}

export async function uploadPlayerPhoto(
  supabase: TypedSupabaseClient,
  teamId: string,
  playerId: string,
  blob: Blob,
): Promise<string> {
  const path = `${teamId}/${playerId}/${crypto.randomUUID()}.${extensionFor(blob.type)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removePhotoFiles(supabase: TypedSupabaseClient, paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(list);
  if (error) throw error;
}

/** Entfernt alle Fotos eines Spielers (z. B. nach dem Löschen). */
export async function removeAllPlayerPhotos(supabase: TypedSupabaseClient, teamId: string, playerId: string): Promise<void> {
  const folder = `${teamId}/${playerId}`;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).list(folder, { limit: 100 });
  if (error) throw error;
  await removePhotoFiles(
    supabase,
    (data ?? []).map((f) => `${folder}/${f.name}`),
  );
}

export async function createSignedPhotoUrls(
  supabase: TypedSupabaseClient,
  paths: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export const SIGNED_URL_REFRESH_MS = (SIGNED_URL_TTL_SECONDS - 5 * 60) * 1000;
