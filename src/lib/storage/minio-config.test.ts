import { afterEach, describe, expect, it } from "vitest";

import { getMinioConfigFromEnv } from "./minio-config";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("getMinioConfigFromEnv", () => {
  it("requires all server-side MinIO credentials", () => {
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;

    expect(() => getMinioConfigFromEnv()).toThrow("Missing required MinIO environment variables");
  });

  it("reads explicit env without unsafe defaults", () => {
    process.env.MINIO_ENDPOINT = "http://127.0.0.1:9000";
    process.env.MINIO_ACCESS_KEY = "access";
    process.env.MINIO_SECRET_KEY = "secret";
    process.env.MINIO_REGION = "eu-test-1";
    process.env.MINIO_FORCE_PATH_STYLE = "false";

    expect(getMinioConfigFromEnv()).toEqual({
      endpoint: "http://127.0.0.1:9000",
      accessKeyId: "access",
      secretAccessKey: "secret",
      region: "eu-test-1",
      forcePathStyle: false,
    });
  });
});
