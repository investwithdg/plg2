/**
 * browser.ts
 *
 * Reusable browser environment mocks for PLG2 test suites:
 * - window.print (success, sandbox DOMException throwing, generic errors, missing)
 * - navigator.clipboard (success, permission error, clipboard write tracking)
 * - window.localStorage (isolated in-memory storage)
 */
import { vi } from "vitest";

export type PrintMockBehavior = "success" | "throw-dom-exception" | "throw-generic" | "missing";
export type ClipboardMockBehavior = "success" | "throw-dom-exception" | "throw-generic";

const originalPrint = typeof window !== "undefined" ? window.print : undefined;
const originalClipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
const originalLocalStorage = typeof window !== "undefined" ? window.localStorage : undefined;

let currentPrintMock: ReturnType<typeof vi.fn> | null = null;
let currentClipboardMock: {
  writeText: ReturnType<typeof vi.fn>;
  readText: ReturnType<typeof vi.fn>;
} | null = null;

/**
 * Configure window.print behavior.
 * - 'success': normal resolution with vi.fn tracking.
 * - 'throw-dom-exception': simulates sandboxed iframe without allow-modals.
 * - 'throw-generic': simulates general printer subsystem error.
 * - 'missing': simulates environment where window.print is undefined.
 */
export function setupWindowPrintMock(behavior: PrintMockBehavior = "success") {
  if (behavior === "missing") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).print;
    currentPrintMock = null;
    return null;
  }

  const printFn = vi.fn().mockImplementation(() => {
    if (behavior === "throw-dom-exception") {
      throw new DOMException(
        "The document is sandboxed and the 'allow-modals' keyword is not set.",
        "SecurityError",
      );
    }
    if (behavior === "throw-generic") {
      throw new Error("Unable to initialize print subsystem");
    }
    return undefined;
  });

  window.print = printFn;
  currentPrintMock = printFn;
  return printFn;
}

export function getWindowPrintMock() {
  return currentPrintMock;
}

/**
 * Configure navigator.clipboard behavior.
 */
export function setupNavigatorClipboardMock(behavior: ClipboardMockBehavior = "success") {
  let clipboardStore = "";

  const writeText = vi.fn().mockImplementation(async (text: string) => {
    if (behavior === "throw-dom-exception") {
      throw new DOMException("Clipboard write permission denied", "NotAllowedError");
    }
    if (behavior === "throw-generic") {
      throw new Error("Clipboard operation failed");
    }
    clipboardStore = text;
    return undefined;
  });

  const readText = vi.fn().mockImplementation(async () => {
    if (behavior === "throw-dom-exception") {
      throw new DOMException("Clipboard read permission denied", "NotAllowedError");
    }
    return clipboardStore;
  });

  const mock = { writeText, readText };
  Object.defineProperty(navigator, "clipboard", {
    value: mock,
    configurable: true,
    writable: true,
  });

  currentClipboardMock = mock;
  return mock;
}

export function getNavigatorClipboardMock() {
  return currentClipboardMock;
}

/**
 * In-memory localStorage mock for isolated state testing.
 */
export function setupLocalStorageMock(initialStore: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialStore));

  const storage: Storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });

  return storage;
}

/**
 * Reset all browser mocks back to original environment state.
 */
export function restoreBrowserMocks() {
  if (originalPrint) {
    window.print = originalPrint;
  }
  if (originalClipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  }
  if (originalLocalStorage) {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  }
  currentPrintMock = null;
  currentClipboardMock = null;
}
