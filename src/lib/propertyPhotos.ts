/**
 * propertyPhotos.ts
 *
 * Browser-side half of the Vision+ (Elite) photo pipeline.
 *
 * Flow, in order — photos need a real property row to hang off of, so none of
 * this runs until `receive-property` has returned a propertyId:
 *   1. upload each File to the private `property-photos` bucket at
 *      `{user_id}/{property_id}/{uuid}-{filename}`
 *   2. insert one `property_photos` row per uploaded object (status "pending"),
 *      straight from the browser client — RLS scopes rows to auth.uid()
 *   3. kick the `analyze-property-photos` edge function with { propertyId }
 *
 * Everything here is best-effort: the fast text-only listing has already been
 * kicked off by the time these run, so failures are reported to the caller and
 * surfaced as a non-blocking toast rather than failing the generation.
 */
import { supabase } from "@/integrations/supabase/client";

export const PROPERTY_PHOTOS_BUCKET = "property-photos";

export interface UploadPropertyPhotosResult {
  /** Photos that made it to Storage *and* got a property_photos row. */
  uploaded: number;
  failed: number;
}

export interface AnalyzePropertyPhotosResult {
  processed: number;
  failed: number;
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Storage object keys don't tolerate arbitrary filenames (spaces, unicode,
 * slashes), so the "original filename" segment is normalized. The uuid prefix
 * already guarantees uniqueness, and the backend reads the exact path back off
 * the `storage_path` column — it never reconstructs it from the filename.
 */
function safeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleaned || "photo").slice(0, 100);
}

export async function uploadPropertyPhotos({
  propertyId,
  userId,
  files,
}: {
  propertyId: string;
  userId: string;
  files: File[];
}): Promise<UploadPropertyPhotosResult> {
  if (files.length === 0) return { uploaded: 0, failed: 0 };

  const paths = await Promise.all(
    files.map(async (file) => {
      const path = `${userId}/${propertyId}/${newUuid()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(PROPERTY_PHOTOS_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        console.error("Photo upload failed:", file.name, error);
        return null;
      }
      return path;
    }),
  );

  const uploadedPaths = paths.filter((path): path is string => path !== null);
  const uploadFailures = files.length - uploadedPaths.length;
  if (uploadedPaths.length === 0) return { uploaded: 0, failed: files.length };

  const { error: insertError } = await supabase.from("property_photos").insert(
    uploadedPaths.map((storage_path) => ({
      property_id: propertyId,
      user_id: userId,
      storage_path,
      status: "pending",
    })),
  );

  if (insertError) {
    // Objects are in the bucket but nothing references them — the analyzer works
    // off the table, so treat the whole batch as failed.
    console.error("Failed to record property photos:", insertError);
    return { uploaded: 0, failed: files.length };
  }

  return { uploaded: uploadedPaths.length, failed: uploadFailures };
}

/**
 * Fire the async vision analysis. Throws on transport errors (function missing,
 * 403 for non-Elite, network) so the caller can toast; never called with await
 * in a path that blocks rendering the listing.
 */
export async function analyzePropertyPhotos(
  propertyId: string,
): Promise<AnalyzePropertyPhotosResult> {
  const { data, error } = await supabase.functions.invoke("analyze-property-photos", {
    body: { propertyId },
  });
  if (error) throw error;

  const payload = (data ?? {}) as { processed?: number; failed?: number; error?: string };
  if (payload.error) throw new Error(payload.error);

  return {
    processed: Number(payload.processed ?? 0),
    failed: Number(payload.failed ?? 0),
  };
}
