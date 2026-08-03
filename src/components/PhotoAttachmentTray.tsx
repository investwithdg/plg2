/**
 * PhotoAttachmentTray.tsx
 *
 * Win95-styled "attachment tray" for the Vision+ flow (Elite-only, gated by the
 * parent): drop zone / file picker for up to 5 property photos, with thumbnail
 * previews and a per-photo remove button.
 *
 * Deliberately dumb + reusable: it holds File objects in local state and reports
 * them upward via onPhotosChange. It knows nothing about Supabase, uploads, or
 * plan tiers — RetroGenerator owns all of that. To clear the tray, remount it
 * (bump its `key`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { RetroButton } from "@/components/retro";

/** Vision+ ships with a hard cap of 5 photos per property. */
export const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per photo

interface TrayPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface PhotoAttachmentTrayProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  className?: string;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotoAttachmentTray({
  onPhotosChange,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
  className,
}: PhotoAttachmentTrayProps) {
  const [photos, setPhotos] = useState<TrayPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke every outstanding object URL when the tray unmounts (the parent
  // remounts it to clear the tray after a successful submit).
  const photosRef = useRef<TrayPhoto[]>([]);
  photosRef.current = photos;
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;

      const rejected: string[] = [];
      const accepted: File[] = [];

      for (const file of incoming) {
        if (!file.type.startsWith("image/")) {
          rejected.push(`${file.name} — not an image`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`${file.name} — over ${formatBytes(MAX_FILE_BYTES)}`);
          continue;
        }
        accepted.push(file);
      }

      const current = photosRef.current;
      const room = Math.max(0, maxPhotos - current.length);
      const taken = accepted.slice(0, room);
      if (accepted.length > room) {
        sonnerToast.error(`${maxPhotos} photos max`, {
          description: "Remove a photo to attach a different one.",
        });
      }

      if (taken.length > 0) {
        const next = [
          ...current,
          ...taken.map((file) => ({
            id: newId(),
            file,
            previewUrl: URL.createObjectURL(file),
          })),
        ];
        photosRef.current = next;
        setPhotos(next);
        onPhotosChange(next.map((p) => p.file));
      }

      if (rejected.length > 0) {
        sonnerToast.error("Some files were skipped", {
          description: rejected.join(", "),
        });
      }
    },
    [disabled, maxPhotos, onPhotosChange],
  );

  const removePhoto = useCallback(
    (id: string) => {
      const target = photosRef.current.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = photosRef.current.filter((p) => p.id !== id);
      photosRef.current = next;
      setPhotos(next);
      onPhotosChange(next.map((p) => p.file));
    },
    [onPhotosChange],
  );

  const isFull = photos.length >= maxPhotos;

  return (
    <div className={className}>
      <div className="win95-raised bg-card p-2 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-win95-11 font-bold">
            Vision+ photos{" "}
            <span className="text-[#FFD700] [text-shadow:1px_1px_0_rgba(0,0,0,0.8)]">★</span>
          </span>
          <span className="text-win95-11 text-muted-foreground">
            {photos.length}/{maxPhotos} attached
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isFull) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(Array.from(e.dataTransfer?.files ?? []));
          }}
          className={`win95-inset bg-white px-3 py-3 text-center ${
            isDragging ? "bg-[var(--win95-gray)]" : ""
          }`}
        >
          <p className="text-win95-11 text-slate-700 mb-2">
            {isFull
              ? `${maxPhotos} photos attached — remove one to swap it out.`
              : "Drop up to 5 property photos here, or pick them from your computer."}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              // Reset so re-picking the same file still fires onChange.
              e.target.value = "";
            }}
          />
          <RetroButton
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isFull}
            className="mx-auto"
          >
            Choose photos...
          </RetroButton>
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="win95-raised bg-card p-1 relative">
                <img
                  src={photo.previewUrl}
                  alt={photo.file.name}
                  title={`${photo.file.name} (${formatBytes(photo.file.size)})`}
                  className="w-16 h-16 object-cover win95-inset bg-white block"
                />
                <button
                  type="button"
                  aria-label={`Remove ${photo.file.name}`}
                  title="Remove"
                  className="win95-control-btn absolute -top-1 -right-1"
                  onClick={() => removePhoto(photo.id)}
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Photos are analyzed in the background after your listing is generated — your copy appears
          in ~15 seconds either way.
        </p>
      </div>
    </div>
  );
}
