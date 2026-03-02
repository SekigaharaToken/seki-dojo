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
    it("parent cast has no mentions, replies have mentions", () => {
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

      // 1 parent (no mentions) + 1 reply (2 mentions)
      expect(casts).toHaveLength(2);
      expect(casts[0].isParent).toBe(true);
      expect(casts[0].mentions).toEqual([]);
      expect(casts[0].text).toContain("Week 3");
      expect(casts[0].text).toContain("3 warriors");
      expect(casts[1].isParent).toBe(false);
      expect(casts[1].mentions).toEqual([1, 2]);
    });

    it("splits mentions into multiple replies for >10 users", () => {
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

      // 1 parent + 3 replies (10 + 10 + 5)
      expect(casts).toHaveLength(4);
      expect(casts[0].isParent).toBe(true);
      expect(casts[0].mentions).toEqual([]);
      expect(casts[1].isParent).toBe(false);
      expect(casts[1].mentions).toHaveLength(10);
      expect(casts[2].isParent).toBe(false);
      expect(casts[2].mentions).toHaveLength(10);
      expect(casts[3].isParent).toBe(false);
      expect(casts[3].mentions).toHaveLength(5);
    });

    it("returns only parent when zero mentionable users", () => {
      const fidMap = new Map();
      const casts = composeCasts({
        tier: makeTier(1),
        reward: 100,
        weekNumber: 1,
        fidMap,
        addresses: ["0xAAA"],
      });

      expect(casts).toHaveLength(1);
      expect(casts[0].isParent).toBe(true);
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
    it("posts parent announcement + reply casts with mentions", async () => {
      const fidMap = new Map();
      const addresses = [];
      for (let i = 0; i < 15; i++) {
        const addr = `0x${i.toString(16).padStart(40, "0")}`;
        fidMap.set(addr, { fid: i + 1, username: `user${i}` });
        addresses.push(addr);
      }

      // Parent cast (announcement, no mentions)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xparent" } }),
      });
      // Reply cast 1 (10 mentions)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xreply1" } }),
      });
      // Reply cast 2 (5 mentions)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xreply2" } }),
      });

      const hashes = await postTierNotification({
        tier: makeTier(1),
        reward: 100,
        weekNumber: 1,
        fidMap,
        addresses,
        distributionId: 5644,
      });

      expect(hashes).toEqual(["0xparent", "0xreply1", "0xreply2"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Parent has channel + airdrop embed with specific distribution ID, no mentions
      const parentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parentBody.channel_id).toBe("hunt");
      expect(parentBody.embeds).toHaveLength(2);
      expect(parentBody.embeds[0].url).toBe("https://mint.club/airdrops/base/5644");
      expect(parentBody.embeds[1].url).toContain("farcaster.xyz/~/c/base:0xa4f51ca123d141d4ae3c63afc663ef7fb5c70b07");
      expect(parentBody.parent).toBeUndefined();
      expect(parentBody.mentions).toBeUndefined();

      // Reply 1 has parent hash + 10 mentions, no channel/embed
      const reply1Body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(reply1Body.parent).toBe("0xparent");
      expect(reply1Body.mentions).toHaveLength(10);
      expect(reply1Body.channel_id).toBeUndefined();
      expect(reply1Body.embeds).toBeUndefined();

      // Reply 2 has parent hash + 5 mentions
      const reply2Body = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(reply2Body.parent).toBe("0xparent");
      expect(reply2Body.mentions).toHaveLength(5);
    });
  });

  describe("formatDryRunPreview", () => {
    it("formats preview with mention counts and reply info", () => {
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
      expect(preview).toContain("1 announcement");
      expect(preview).toContain("1 reply cast");
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
      // Parent cast (announcement)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xparent" } }),
      });
      // Reply cast (mentions)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xreply" } }),
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await notifyDistributions({
        tierResults: [{ tier: makeTier(1), addresses: ["0xAAA"] }],
        weekNumber: 1,
      });

      // 1 FID lookup + 1 parent + 1 reply
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
      // Parent cast succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cast: { hash: "0xparent" } }),
      });
      // Reply cast fails
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
