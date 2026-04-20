import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type FetchHandler = (event: {
  request: Request;
  respondWith: ReturnType<typeof vi.fn>;
}) => void;

function loadFetchHandler(): FetchHandler {
  const listeners = new Map<string, EventListener>();
  const scriptPath = path.resolve(process.cwd(), "public/sw.js");
  const source = fs.readFileSync(scriptPath, "utf8");

  const context = vm.createContext({
    URL,
    Request,
    caches: {
      open: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
      match: vi.fn(),
    },
    console,
    fetch: vi.fn(),
    self: {
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      clients: {
        claim: vi.fn(),
        matchAll: vi.fn(),
        openWindow: vi.fn(),
      },
      location: {
        origin: "https://greenlog.app",
      },
      registration: {
        showNotification: vi.fn(),
      },
      skipWaiting: vi.fn(),
    },
  });

  vm.runInContext(source, context, { filename: scriptPath });

  const handler = listeners.get("fetch");
  if (!handler) {
    throw new Error("Service worker fetch handler was not registered");
  }

  return handler as FetchHandler;
}

describe("service worker external image routing", () => {
  it("does not intercept external image requests from imgix", () => {
    const fetchHandler = loadFetchHandler();
    const respondWith = vi.fn();
    const request = new Request(
      "https://leafly-public.imgix.net/strains/reviews/photos/the-hog__primary_5922.jpg",
      { method: "GET" }
    );

    fetchHandler({ request, respondWith });

    expect(respondWith).not.toHaveBeenCalled();
  });

  it("still handles non-image external requests itself", () => {
    const fetchHandler = loadFetchHandler();
    const respondWith = vi.fn();
    const request = new Request("https://example.com/assets/app.css", {
      method: "GET",
      headers: { accept: "text/css" },
    });

    fetchHandler({ request, respondWith });

    expect(respondWith).toHaveBeenCalledOnce();
  });
});
