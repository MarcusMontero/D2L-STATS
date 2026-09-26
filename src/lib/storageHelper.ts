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
  // Always prepare local data URL first for instant offline preview & local storage
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
