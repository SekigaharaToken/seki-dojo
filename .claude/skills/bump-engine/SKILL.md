---
name: bump-engine
description: Update @sekigahara/engine to latest AMATERASU commit, clear caches, reinstall
disable-model-invocation: true
---

Update the `@sekigahara/engine` dependency to the latest AMATERASU commit.

Steps:
1. Get the latest commit hash: `git -C /Users/psd/Documents/PROJECTS/SEKI/AMATERASU rev-parse --short HEAD`
2. Update `package.json` engine pin to `github:SekigaharaToken/AMATERASU#<hash>`
3. Clear the Vite pre-bundle cache: `rm -rf node_modules/.vite`
4. Reinstall: `npm install`
5. Verify build: `npm run build`
6. Ask the user if they want to deploy with `/deploy`
