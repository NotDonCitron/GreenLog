import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StrainsPage from "./page";

const pushMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => searchParams,
}));

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: () => ({
    data: {
      pages: [
        {
          strains: [
            { id: "strain-1", slug: "alpha", name: "Alpha", type: "hybrid" },
            { id: "strain-2", slug: "beta", name: "Beta", type: "sativa" },
          ],
          totalCount: 2,
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isDemoMode: false,
    activeOrganization: null,
  }),
}));

vi.mock("@/hooks/useCollection", () => ({
  useCollection: () => ({
    collectedIds: [],
  }),
}));

vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));

vi.mock("@/components/strains/strain-card", () => ({
  StrainCard: ({ strain }: { strain: { name: string } }) => <article>{strain.name}</article>,
}));

vi.mock("@/components/strains/filter-panel", () => ({
  FilterPanel: () => null,
}));

vi.mock("@/components/strains/active-filter-badges", () => ({
  ActiveFilterBadges: () => null,
}));

describe("StrainsPage floating actions", () => {
  beforeEach(() => {
    pushMock.mockClear();
    searchParams = new URLSearchParams();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
  });

  it("uses one collapsed add button for manual and photo strain creation", async () => {
    render(<StrainsPage />);

    expect(screen.getByLabelText("Strain hinzufügen")).toBeTruthy();
    expect(screen.queryByLabelText("Neue Sorte erstellen")).toBeNull();
    expect(screen.queryByLabelText("Strain-Scanner öffnen")).toBeNull();

    fireEvent.click(screen.getByLabelText("Strain hinzufügen"));

    expect(await screen.findByLabelText("Strain per Foto hinzufügen")).toBeTruthy();
    expect(screen.getByLabelText("Strain manuell hinzufügen")).toBeTruthy();
  });

  it("keeps the strains page visible on the first add menu click", () => {
    render(<StrainsPage />);

    fireEvent.click(screen.getByLabelText("Strain hinzufügen"));

    expect(screen.getByRole("heading", { name: "Strains" })).toBeTruthy();
    expect(screen.getByLabelText("Strain per Foto hinzufügen")).toBeTruthy();
  });

  it("opens the manual strain modal from the expanded add menu", async () => {
    render(<StrainsPage />);

    fireEvent.click(screen.getByLabelText("Strain hinzufügen"));
    fireEvent.click(await screen.findByLabelText("Strain manuell hinzufügen"));

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Neue Sorte")).toBeTruthy();
    expect(screen.queryByText(/Leafly/i)).toBeNull();
    expect(screen.queryByPlaceholderText("https://www.leafly.com/strains/...")).toBeNull();
  });

  it("keeps the compare action in a bottom tray away from strain cards", () => {
    searchParams = new URLSearchParams("compare=alpha,beta");

    render(<StrainsPage />);

    const compareBar = screen.getByTestId("strain-compare-bar");
    expect(compareBar.className).toContain("left-4");
    expect(compareBar.className).toContain("right-4");
    expect(compareBar.className).not.toContain("right-6");
  });
});
