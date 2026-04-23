import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegister } from "./service-worker-register";

const registerMock = vi.fn();
const getRegistrationsMock = vi.fn();
const unregisterMock = vi.fn();

describe("ServiceWorkerRegister", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDisableSw = process.env.NEXT_PUBLIC_DISABLE_SW;

  beforeEach(() => {
    registerMock.mockReset();
    getRegistrationsMock.mockReset();
    unregisterMock.mockReset();
    unregisterMock.mockResolvedValue(true);
    getRegistrationsMock.mockResolvedValue([{ unregister: unregisterMock }]);
    registerMock.mockResolvedValue({ scope: "http://localhost:3001/" });

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock,
        getRegistrations: getRegistrationsMock,
      },
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_DISABLE_SW = originalDisableSw;
    vi.restoreAllMocks();
  });

  it("does not register the service worker in development and unregisters old registrations", async () => {
    process.env.NODE_ENV = "development";

    render(<ServiceWorkerRegister />);

    await waitFor(() => {
      expect(getRegistrationsMock).toHaveBeenCalledOnce();
      expect(unregisterMock).toHaveBeenCalledOnce();
    });

    expect(registerMock).not.toHaveBeenCalled();
  });

  it("registers the service worker in production", async () => {
    process.env.NODE_ENV = "production";

    render(<ServiceWorkerRegister />);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    });

    expect(getRegistrationsMock).not.toHaveBeenCalled();
  });

  it("unregisters in production when NEXT_PUBLIC_DISABLE_SW is true", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_DISABLE_SW = "true";

    render(<ServiceWorkerRegister />);

    await waitFor(() => {
      expect(getRegistrationsMock).toHaveBeenCalledOnce();
      expect(unregisterMock).toHaveBeenCalledOnce();
    });

    expect(registerMock).not.toHaveBeenCalled();
  });
});
