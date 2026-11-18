import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RetroGenerator from "./RetroGenerator";

const mockUseAuth = vi.fn();
const mockUsePlanTier = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/usePlanTier", () => ({
  usePlanTier: (user: unknown) => mockUsePlanTier(user),
}));

vi.mock("@/hooks/usePropertyPolling", () => ({
  usePropertyPolling: () => ({
    status: null,
    enrichmentStep: null,
    property: null,
    copies: [],
    enrichmentData: null,
    error: null,
    stopPolling: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGoogleAutocomplete", () => ({
  useGoogleAutocomplete: () => ({
    predictions: [],
    getPredictions: vi.fn(),
    clearPredictions: vi.fn(),
    refreshSessionToken: vi.fn(),
  }),
}));

vi.mock("@/lib/posthog", () => ({
  track: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: (resolve: (val: { count: number; error: null }) => void) =>
          resolve({ count: 42, error: null }),
      };
      return {
        select: vi.fn(() => chain),
      };
    }),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("RetroGenerator interactive preview & 7-day Pro trial gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("renders interactive preview with all 11 property types and 7-day Pro trial copy for visitors", () => {
    mockUseAuth.mockReturnValue({ user: null, signIn: vi.fn(), signUp: vi.fn(), loading: false });
    mockUsePlanTier.mockReturnValue({
      plan: "free",
      loading: false,
      isLoading: false,
      isProUser: false,
      isEliteUser: false,
    });

    render(<RetroGenerator />);

    expect(screen.getByText(/7-day free Pro trial \(card required\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/10 free generations/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^LUX\b/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^COMM\b/i })).toBeInTheDocument();
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
  });

  it("opens the 7-day Pro trial modal instead of calling receive-property when a visitor clicks generate", async () => {
    mockUseAuth.mockReturnValue({ user: null, signIn: vi.fn(), signUp: vi.fn(), loading: false });
    mockUsePlanTier.mockReturnValue({
      plan: "free",
      loading: false,
      isLoading: false,
      isProUser: false,
      isEliteUser: false,
    });

    render(<RetroGenerator />);

    const input = screen.getByPlaceholderText(/123 main st/i);
    fireEvent.change(input, { target: { value: "123 Main St, Austin, TX" } });

    const generateBtn = screen.getByRole("button", { name: "generate" });
    fireEvent.click(generateBtn);

    expect(await screen.findByText("Start Your 7-Day Free Pro Trial")).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalledWith("receive-property", expect.anything());
  });

  it("routes signed-in users without an active/trialing Pro plan to create-checkout", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "agent@example.com" },
      signIn: vi.fn(),
      signUp: vi.fn(),
      loading: false,
    });
    mockUsePlanTier.mockReturnValue({
      plan: "free",
      loading: false,
      isLoading: false,
      isProUser: false,
      isEliteUser: false,
    });
    mockInvoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/test" },
      error: null,
    });

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "http://localhost/" },
    });

    render(<RetroGenerator />);

    const input = screen.getByPlaceholderText(/123 main st/i);
    fireEvent.change(input, { target: { value: "456 Oak Ave, Dallas, TX" } });
    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    const startTrialBtn = await screen.findByRole("button", {
      name: /Start 7-Day Free Trial \(\$49\/mo after\)/i,
    });
    fireEvent.click(startTrialBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("create-checkout", {
        body: { interval: "month" },
      });
    });

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("invokes receive-property directly for active/trialing Pro users", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "pro-user-1", email: "pro@example.com" },
      signIn: vi.fn(),
      signUp: vi.fn(),
      loading: false,
    });
    mockUsePlanTier.mockReturnValue({
      plan: "pro",
      loading: false,
      isLoading: false,
      isProUser: true,
      isEliteUser: false,
    });
    mockInvoke.mockResolvedValue({ data: { success: true, propertyId: "prop-1" }, error: null });

    render(<RetroGenerator />);

    const input = screen.getByPlaceholderText(/123 main st/i);
    fireEvent.change(input, { target: { value: "789 Pine Rd, Austin, TX" } });
    fireEvent.click(screen.getByRole("button", { name: "generate" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("receive-property", {
        body: {
          address: "789 Pine Rd, Austin, TX",
          propertyType: "sfr",
          source: "generator",
        },
      });
    });
    expect(screen.queryByText("Start Your 7-Day Free Pro Trial")).not.toBeInTheDocument();
  });
});
