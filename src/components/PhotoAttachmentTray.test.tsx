import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const { default: PhotoAttachmentTray, MAX_PHOTOS } = await import("./PhotoAttachmentTray");

const imageFile = (name: string, type = "image/jpeg", size = 1024) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

function pick(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

beforeAll(() => {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${n++}`);
  URL.revokeObjectURL = vi.fn();
});

describe("PhotoAttachmentTray", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports picked images to the parent and renders a thumbnail each", () => {
    const onPhotosChange = vi.fn();
    render(<PhotoAttachmentTray onPhotosChange={onPhotosChange} />);

    pick([imageFile("front.jpg"), imageFile("kitchen.png", "image/png")]);

    expect(onPhotosChange).toHaveBeenCalledTimes(1);
    expect(onPhotosChange.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "front.jpg",
      "kitchen.png",
    ]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText(`2/${MAX_PHOTOS} attached`)).toBeInTheDocument();
  });

  it("caps the tray at 5 photos", () => {
    const onPhotosChange = vi.fn();
    render(<PhotoAttachmentTray onPhotosChange={onPhotosChange} />);

    pick(Array.from({ length: 7 }, (_, i) => imageFile(`p${i}.jpg`)));

    expect(onPhotosChange.mock.calls[0][0]).toHaveLength(MAX_PHOTOS);
    expect(screen.getAllByRole("img")).toHaveLength(MAX_PHOTOS);
    expect(screen.getByText(`${MAX_PHOTOS}/${MAX_PHOTOS} attached`)).toBeInTheDocument();
  });

  it("skips non-images and oversized files", () => {
    const onPhotosChange = vi.fn();
    render(<PhotoAttachmentTray onPhotosChange={onPhotosChange} />);

    pick([
      imageFile("deed.pdf", "application/pdf"),
      imageFile("huge.jpg", "image/jpeg", 20 * 1024 * 1024),
      imageFile("ok.jpg"),
    ]);

    expect(onPhotosChange.mock.calls[0][0].map((f: File) => f.name)).toEqual(["ok.jpg"]);
  });

  it("removes a photo with its × button and revokes the preview URL", () => {
    const onPhotosChange = vi.fn();
    render(<PhotoAttachmentTray onPhotosChange={onPhotosChange} />);

    pick([imageFile("front.jpg"), imageFile("back.jpg")]);
    fireEvent.click(screen.getByRole("button", { name: "Remove front.jpg" }));

    expect(onPhotosChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: "back.jpg" }),
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("accepts dropped files", () => {
    const onPhotosChange = vi.fn();
    const { container } = render(<PhotoAttachmentTray onPhotosChange={onPhotosChange} />);
    const dropZone = container.querySelector(".win95-inset") as HTMLElement;

    fireEvent.drop(dropZone, { dataTransfer: { files: [imageFile("dropped.jpg")] } });

    expect(onPhotosChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: "dropped.jpg" }),
    ]);
  });
});
