import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock workspace API client to avoid network calls
vi.mock("@workspace/api-client-react", () => ({
  useGetApiAuthMe: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

// Mock zustand auth store
vi.mock("../hooks/use-auth", () => ({
  useAuthStore: vi.fn(() => ({ token: null, setToken: vi.fn(), clearToken: vi.fn() })),
}));

// Mock wouter to keep routing simple in tests
vi.mock("wouter", async (importOriginal) => {
  const mod = await importOriginal<typeof import("wouter")>();
  return {
    ...mod,
    Router: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: vi.fn(() => ["/", vi.fn()]),
    useRoute: vi.fn(() => [false, {}]),
  };
});

import App from "../App";

describe("App smoke test", () => {
  it("renders without throwing", () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it("mounts the app component", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });
});
