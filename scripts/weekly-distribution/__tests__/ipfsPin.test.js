import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { pinToIpfs } = await import("../ipfsPin.js");

describe("ipfsPin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts JSON to Pinata API and returns CID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ IpfsHash: "QmTestCid123" }),
    });

    const cid = await pinToIpfs(
      { test: "data" },
      "dojo-week-1-tier-1.json",
    );

    expect(cid).toBe("QmTestCid123");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("pinata");
    expect(options.method).toBe("POST");
  });

  it("throws on Pinata API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(
      pinToIpfs({ test: "data" }, "test.json"),
    ).rejects.toThrow(/Pinata/i);
  });
});
