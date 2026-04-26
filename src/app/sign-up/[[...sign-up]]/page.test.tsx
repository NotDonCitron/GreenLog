import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUpPage from "./page";

const { pushMock, refreshMock, setSessionMock, signUpMock, signInWithPasswordMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  setSessionMock: vi.fn(),
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      setSession: setSessionMock,
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
    },
  },
}));

describe("SignUpPage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockReset();
    refreshMock.mockReset();
    setSessionMock.mockReset();
    signUpMock.mockReset();
    signInWithPasswordMock.mockReset();
  });

  it("creates account via local sign-up API and redirects to home when a session is returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    setSessionMock.mockResolvedValue({ error: null });
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithPasswordMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Konto erstellen/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/sign-up",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("requires privacy acceptance before submit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Konto erstellen/i }));

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("falls back to direct auth and redirects to sign-in when no session is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("NetworkError when attempting to fetch resource.")));
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    signInWithPasswordMock.mockResolvedValue({ data: { session: null }, error: null });
    setSessionMock.mockResolvedValue({ error: null });

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Konto erstellen/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "secret123",
      });
    });

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secret123",
    });
    expect(pushMock).toHaveBeenCalledWith("/sign-in");
    expect(setSessionMock).not.toHaveBeenCalled();
  });
});
