---
name: deploy
description: Deploy to Vercel production with force flag to skip build cache
disable-model-invocation: true
---

Deploy the DOJO app to Vercel production. Always use `--force` to skip the build cache — this is required after engine updates to prevent serving stale code.

Steps:
1. Run `vercel deploy --prod --force`
2. Report the production URL when complete
