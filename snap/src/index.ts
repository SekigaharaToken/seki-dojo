import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerSnapHandler } from "@farcaster/snap-hono";
import {
  SPEC_VERSION,
  ACTION_TYPE_POST,
  type SnapFunction,
} from "@farcaster/snap";
import { checkEligibility } from "./eligibilityChecker.js";

const CLAIM_BASE_URL =
  process.env.CLAIM_BASE_URL ?? "https://dojo.sekigahara.app";

const app = new Hono();

/**
 * Derive the snap's public base URL (origin) from the incoming request,
 * respecting reverse-proxy headers and the SNAP_PUBLIC_BASE_URL env override.
 */
function snapBaseUrlFromRequest(request: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return fromEnv.replace(/\/$/, "");
    }
  }
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

const snap: SnapFunction = async (ctx) => {
  const base = snapBaseUrlFromRequest(ctx.request);

  // POST = user tapped "Check Eligibility" or "Try Again"
  if (ctx.action.type === ACTION_TYPE_POST) {
    const fid = ctx.action.user.fid;

    try {
      const result = await checkEligibility(fid);

      if (!result) {
        return notEligiblePage(base);
      }

      if (result.alreadyClaimed) {
        return alreadyClaimedPage(base, result.week);
      }

      return eligiblePage(base, result);
    } catch (err) {
      console.error("Eligibility check failed:", err);
      return errorPage(base, "Something went wrong. Please try again.");
    }
  }

  // Default: root page
  return rootPage(base);
};

function rootPage(base: string) {
  return {
    version: SPEC_VERSION,
    theme: { accent: "red" as const },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          props: {},
          children: ["title", "desc", "checkBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "DOJO Weekly Airdrop", weight: "bold" as const },
        },
        desc: {
          type: "text" as const,
          props: {
            content: "Check if you qualify for this week's $DOJO reward",
          },
        },
        checkBtn: {
          type: "button" as const,
          props: { label: "Check Eligibility", variant: "primary" as const },
          on: {
            press: {
              action: "submit" as const,
              params: { target: `${base}/` },
            },
          },
        },
      },
    },
  };
}

function eligiblePage(
  base: string,
  result: {
    reward: number;
    week: number;
    tierId: number;
    distributionId: number;
    proof: string[];
    address: string;
  },
) {
  const proofParam = result.proof.join(",");
  const claimUrl = `${CLAIM_BASE_URL}/claim?id=${result.distributionId}&proof=${proofParam}&address=${result.address}`;
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "green" as const },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          props: {},
          children: ["title", "detail", "claimBtn", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "You qualify!", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content: `${result.reward} $DOJO — Week ${result.week}, Tier ${result.tierId}`,
          },
        },
        claimBtn: {
          type: "button" as const,
          props: { label: "Claim Now", variant: "primary" as const },
          on: {
            press: {
              action: "open_url" as const,
              params: { target: claimUrl },
            },
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { label: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: `I qualified for ${result.reward} $DOJO this week! Check if you're eligible too`,
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function alreadyClaimedPage(base: string, week: number) {
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "green" as const },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          props: {},
          children: ["title", "detail", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Already Claimed", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content: `You've already claimed your Week ${week} reward`,
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { label: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: "I claimed my $DOJO reward! Check if you qualify too",
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function notEligiblePage(base: string) {
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "red" as const },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          props: {},
          children: ["title", "detail", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Not Eligible", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content:
              "Your wallet isn't in this week's distribution. Keep checking in at the dojo!",
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { label: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: "Check if you qualify for this week's $DOJO airdrop",
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function errorPage(base: string, message: string) {
  return {
    version: SPEC_VERSION,
    theme: { accent: "red" as const },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          props: {},
          children: ["title", "detail", "retryBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Error", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: { content: message },
        },
        retryBtn: {
          type: "button" as const,
          props: { label: "Try Again", variant: "primary" as const },
          on: {
            press: {
              action: "submit" as const,
              params: { target: `${base}/` },
            },
          },
        },
      },
    },
  };
}

registerSnapHandler(app, snap);

const port = parseInt(process.env.PORT ?? "3003", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Snap server running on http://localhost:${port}`);
});

export default app;
