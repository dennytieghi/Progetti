/**
 * Limiti per le foto caricate — unica fonte di verità, usata sia dal
 * controllo immediato nel browser (NuovoPostForm) sia da quello lato
 * server (lib/photos.ts). Se cambi il limite, aggiorna anche
 * `bodySizeLimit` in next.config.ts (deve restare più alto).
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};
