import { supabase, isSupabaseConfigured } from "./supabaseClient";

/**
 * Upload an image file to Supabase Storage, with automatic fallback to DataURL for offline resilience.
 * @param file The image file selected by user
 * @param bucket 'team-logos' or 'player-photos'
 * @returns Promise with the public URL or data URI
 */
export async function uploadImage(
  file: File,
  bucket: "team-logos" | "player-photos" = "team-logos"
): Promise<string> {
  const localDataUrl = await fileToDataUrl(file);

  if (!isSupabaseConfigured) {
    return localDataUrl;
  }

  try {
    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${bucket.slice(0, 4)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error, using local fallback:", uploadError.message);
      return localDataUrl;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || localDataUrl;
  } catch (err) {
    console.warn("Upload exception, falling back to local data URL:", err);
    return localDataUrl;
  }
}

/**
 * Deletes an image from Supabase Storage if it's a Supabase URL.
 */
export async function deleteImage(
  url: string,
  bucket: "team-logos" | "player-photos"
): Promise<boolean> {
  if (!url || !isSupabaseConfigured) return true;

  try {
    // Extract file path from Supabase storage URL if applicable
    if (url.includes(`/storage/v1/object/public/${bucket}/`)) {
      const path = url.split(`/storage/v1/object/public/${bucket}/`)[1];
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }
    }
    return true;
  } catch (err) {
    console.warn("Error deleting image from Supabase:", err);
    return false;
  }
}

/**
 * Converts a File object to a base64 Data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
