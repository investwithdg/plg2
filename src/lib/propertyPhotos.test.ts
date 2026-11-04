import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const insert = vi.fn();
const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ upload }) },
    from: () => ({ insert }),
    functions: { invoke },
  },
}));

const { analyzePropertyPhotos, uploadPropertyPhotos } = await import("./propertyPhotos");

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("uploadPropertyPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: null });
  });

  it("uploads to {user_id}/{property_id}/{uuid}-{filename} and inserts pending rows", async () => {
    const result = await uploadPropertyPhotos({
      propertyId: "prop-1",
      userId: "user-1",
      files: [file("front.jpg"), file("kitchen.png")],
    });

    expect(result).toEqual({ uploaded: 2, failed: 0 });
    expect(upload).toHaveBeenCalledTimes(2);

    const paths = upload.mock.calls.map((call) => call[0] as string);
    for (const path of paths) {
      expect(path).toMatch(/^user-1\/prop-1\/[0-9a-zA-Z-]+-(front\.jpg|kitchen\.png)$/);
    }

    const rows = insert.mock.calls[0][0] as Array<Record<string, string>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      property_id: "prop-1",
      user_id: "user-1",
      status: "pending",
    });
    expect(paths).toContain(rows[0].storage_path);
  });

  it("normalizes unsafe filenames into the storage key", async () => {
    await uploadPropertyPhotos({
      propertyId: "prop-1",
      userId: "user-1",
      files: [file("my photo (1)!.jpg")],
    });
    expect(upload.mock.calls[0][0]).toMatch(/^user-1\/prop-1\/[0-9a-zA-Z-]+-my-photo-1-\.jpg$/);
  });

  it("counts per-file storage failures but still records the successes", async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "boom" } });

    const result = await uploadPropertyPhotos({
      propertyId: "prop-1",
      userId: "user-1",
      files: [file("a.jpg"), file("b.jpg")],
    });

    expect(result).toEqual({ uploaded: 1, failed: 1 });
    expect((insert.mock.calls[0][0] as unknown[]).length).toBe(1);
  });

  it("treats an insert failure as a fully failed batch and does not throw", async () => {
    insert.mockResolvedValue({ error: { message: "relation does not exist" } });

    await expect(
      uploadPropertyPhotos({ propertyId: "p", userId: "u", files: [file("a.jpg")] }),
    ).resolves.toEqual({ uploaded: 0, failed: 1 });
  });

  it("no-ops on an empty tray", async () => {
    await expect(
      uploadPropertyPhotos({ propertyId: "p", userId: "u", files: [] }),
    ).resolves.toEqual({ uploaded: 0, failed: 0 });
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("analyzePropertyPhotos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts { propertyId } and returns the processed/failed counts", async () => {
    invoke.mockResolvedValue({ data: { processed: 3, failed: 1 }, error: null });

    await expect(analyzePropertyPhotos("prop-1")).resolves.toEqual({ processed: 3, failed: 1 });
    expect(invoke).toHaveBeenCalledWith("analyze-property-photos", {
      body: { propertyId: "prop-1" },
    });
  });

  it("throws when the function is missing or rejects the caller (e.g. 403 non-Elite)", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Function not found") });
    await expect(analyzePropertyPhotos("prop-1")).rejects.toThrow("Function not found");

    invoke.mockResolvedValue({ data: { error: "elite_required" }, error: null });
    await expect(analyzePropertyPhotos("prop-1")).rejects.toThrow("elite_required");
  });
});
