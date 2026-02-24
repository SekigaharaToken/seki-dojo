import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars before import
process.env.NEYNAR_API_KEY = "test-api-key";
process.env.NEYNAR_SIGNER_UUID = "test-signer-uuid";
process.env.VITE_SEKI_TOKEN_ADDRESS = "0xa4f51ca123d141d4ae3c63afc663ef7fb5c70b07";

const {
  resolveAddressesToFids,
  composeCasts,
  postCast,
  postTierNotification,
  notifyDistributions,
  formatDryRunPreview,
} = await import("../castNotifier.js");

const makeTier = (id, reward = 100) => ({ id, reward, nameKey: `tier.test${id}` });

describe("castNotifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveAddressesToFids", () => {
    it("resolves addresses to FIDs via Neynar API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "0xabc123": [{ fid: 1234, username: "alice" }],
            "0xdef456": [{ fid: 5678, username: "bob" }],
          }),
      });

      const result = await resolveAddressesToFids(["0xABC123", "0xDEF456"]);

      expect(result.size).toBe(2);
      expect(result.get("0xabc123")).toEqual({ fid: 1234, username: "alice" });
      expect(result.get("0xdef456")).toEqual({ fid: 5678, username: "bob" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("bulk-by-address");
      expect(url).toContain("0xabc123");
    });

    it("handles addresses without FC accounts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "0xabc123": [{ fid: 1234, username: "alice" }],
            // 0xdef456 omitted — no FC account
          }),
      });

      const result = await resolveAddressesToFids(["0xABC123", "0xDEF456"]);
      expect(result.size).toBe(1);
      expect(result.has("0xdef456")).toBe(false);
    });

    it("batches requests for >350 addresses", async () => {
      const addresses = Array.from({ length: 400 }, (_, i) =>
        `0x${i.toString(16).padStart(40, "0")}`
      );

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      await resolveAddressesToFids(addresses);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(resolveAddressesToFids(["0xabc"])).rejects.toThrow(/401/);
    });

    it("throws when NEYNAR_API_KEY not set", async () => {
      const saved = process.env.NEYNAR_API_KEY;
      delete process.env.NEYNAR_API_KEY;
      await expect(resolveAddressesToFids(["0xabc"])).rejects.toThrow(/NEYNAR_API_KEY/);
      process.env.NEYNAR_API_KEY = saved;
    });
  });

  describe("composeCasts", () => {
    it("creates a single cast for <=10 mentionable users", () => {
      const fidMap = new Map([
        ["0xaaa", { fid: 1, username: "alice" }],
        ["0xbbb", { fid: 2, username: "bob" }],
      ]);

      const casts = composeCasts({
        tier: makeTier(1),
        reward: 100,
        weekNumber: 3,
        fidMap,
        addresses: ["0xAAA", "0xBBB", "0xCCC"],
      });

      expect(casts).toHaveLength(1);
      expect(casts[0].isParent).toBe(true);
      expect(casts[0].mentions).toEqual([1, 2]);
      expect(casts[0].mentionsPositions).toHaveLength(2);
      expect(casts[0].text).toContain("Week 3");
      expect(casts[0].text).toContain("3 warriors");
    });

    it("splits into multiple casts for >10 mentionable users", () => {
      const fidMap = new Map();
      const addresses = [];
      for (let i = 0; i < 25; i++) {
        const addr = `0x${i.toString(16).padStart(40, "0")}`;
        fidMap.set(addr, { fid: i + 1, username: `user${i}` });
        addresses.push(addr);
      }

      const casts = composeCasts({
        tier: makeTier(2, 150),
        reward: 150,
        weekNumber: 1,
        fidMap,
        addresses,
      });

      // 25 users = 3 casts (10 + 10 + 5)
      expect(casts).toHaveLength(3);
      expect(casts[0].isParent).toBe(true);
      expect(casts[0].mentions).toHaveLength(10);
      expect(casts[1].isParent).toBe(false);
      expect(casts[1].mentions).toHaveLength(10);
      expect(casts[2].isParent).toBe(false);
      expect(casts[2].mentions).toHaveLength(5);
    });

    it("handles zero mentionable users", () => {
      const fidMap = new Map();
      const casts = composeCasts({
        tier: makeTier(1),
        reward: 100,
        weekNumber: 1,
        fidMap,
        addresses: ["0xAAA"],
      });

      expect(casts).toHaveLength(1);
      expect(casts[0].mentions).toEqual([]);
      expect(casts[0].text).toContain("1 warrior");
    });
  });

  describe("postCast", () => {
    it("posts cast via Neynar API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xcast123" } }),
      });

      const hash = await postCast({
        text: "Hello",
        mentions: [1234],
        mentionsPositions: [5],
        embeds: [{ url: "https://example.com" }],
        channelId: "hunt",
      });

      expect(hash).toBe("0xcast123");

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/cast");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.signer_uuid).toBe("test-signer-uuid");
      expect(body.mentions).toEqual([1234]);
      expect(body.mentions_positions).toEqual([5]);
      expect(body.channel_id).toBe("hunt");
      expect(body.embeds).toEqual([{ url: "https://example.com" }]);
    });

    it("posts reply cast with parent hash", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xreply456" } }),
      });

      const hash = await postCast({
        text: "",
        mentions: [5678],
        mentionsPositions: [0],
        parentHash: "0xparent123",
      });

      expect(hash).toBe("0xreply456");
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parent).toBe("0xparent123");
      expect(body.channel_id).toBeUndefined();
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      await expect(postCast({ text: "fail" })).rejects.toThrow(/500/);
    });
  });

  describe("postTierNotification", () => {
    it("posts parent + reply casts for overflow mentions", async () => {
      const fidMap = new Map();
      const addresses = [];
      for (let i = 0; i < 15; i++) {
        const addr = `0x${i.toString(16).padStart(40, "0")}`;
        fidMap.set(addr, { fid: i + 1, username: `user${i}` });
        addresses.push(addr);
      }

      // Parent cast
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xparent" } }),
      });
      // Reply cast
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xreply" } }),
      });

      const hashes = await postTierNotification({
        tier: makeTier(1),
        reward: 100,
        weekNumber: 1,
        fidMap,
        addresses,
      });

      expect(hashes).toEqual(["0xparent", "0xreply"]);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Parent has channel + embed
      const parentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parentBody.channel_id).toBe("hunt");
      expect(parentBody.embeds).toHaveLength(2);
      expect(parentBody.embeds[0].url).toContain("mint.club");
      expect(parentBody.embeds[1].url).toContain("farcaster.xyz/~/c/base:0xa4f51ca123d141d4ae3c63afc663ef7fb5c70b07");
      expect(parentBody.parent).toBeUndefined();

      // Reply has parent hash, no channel/embed
      const replyBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(replyBody.parent).toBe("0xparent");
      expect(replyBody.channel_id).toBeUndefined();
      expect(replyBody.embeds).toBeUndefined();
    });
  });

  describe("formatDryRunPreview", () => {
    it("formats preview with mention counts", () => {
      const fidMap = new Map([
        ["0xaaa", { fid: 1, username: "alice" }],
      ]);
      const tierData = [
        { tier: makeTier(1), addresses: ["0xAAA", "0xBBB"] },
      ];

      const preview = formatDryRunPreview({ tierData, weekNumber: 2, fidMap });
      expect(preview).toContain("Tier 1");
      expect(preview).toContain("2 wallets");
      expect(preview).toContain("1 with Farcaster");
      expect(preview).toContain("@alice");
      expect(preview).toContain("dry run");
    });
  });

  describe("notifyDistributions", () => {
    it("resolves FIDs and posts casts for all tiers", async () => {
      // FID lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "0xaaa": [{ fid: 1, username: "alice" }],
          }),
      });
      // Cast post
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xcast1" } }),
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await notifyDistributions({
        tierResults: [{ tier: makeTier(1), addresses: ["0xAAA"] }],
        weekNumber: 1,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it("shows dry-run preview without posting", async () => {
      // FID lookup only
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await notifyDistributions({
        tierResults: [{ tier: makeTier(1), addresses: ["0xAAA"] }],
        weekNumber: 1,
        dryRun: true,
      });

      // Only 1 fetch (FID lookup), no cast posting
      expect(mockFetch).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it("warns on cast failure without throwing", async () => {
      // FID lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            "0xaaa": [{ fid: 1, username: "alice" }],
          }),
      });
      // Cast post fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Should not throw
      await notifyDistributions({
        tierResults: [{ tier: makeTier(1), addresses: ["0xAAA"] }],
        weekNumber: 1,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("non-fatal"));
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
