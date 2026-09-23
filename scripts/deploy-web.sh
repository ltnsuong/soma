#!/usr/bin/env bash
# The web deploy, as one command that cannot be half-run.
#
# This exists because the site has been taken down three times by deploying
# with a subset of the four required steps. The failure is silent and ugly:
# Vercel serves the repo instead of the build, so mysoma.site returns the raw
# text of index.ts and privacy.html/terms.html vanish — and a missing privacy
# policy is an App Store rejection, not just a broken page.
#
# The order matters and every step is load-bearing:
#   1. expo export       — builds the app into dist/
#   2. postbuild-web.sh  — patches index.html AND copies the legal pages, which
#                          expo export knows nothing about
#   3. vercel build      — produces .vercel/output
#   4. vercel deploy --prebuilt — ships .vercel/output, NOT dist/
#
# Then it verifies, because a deploy that reports success and serves the wrong
# thing is exactly the failure this is guarding against.
set -euo pipefail

SCOPE="mysomaapp"
SITE="https://mysoma.site"
cd "$(dirname "$0")/.."

echo "1/4  expo export"
npx expo export -p web > /dev/null

echo "2/4  postbuild (patches index.html, copies legal pages)"
bash scripts/postbuild-web.sh > /dev/null

echo "3/4  vercel build"
npx vercel build --prod --scope "$SCOPE" > /dev/null

echo "4/4  vercel deploy --prebuilt"
npx vercel deploy --prebuilt --prod --scope "$SCOPE" 2>&1 | grep -iE "Production|Aliased" || true

echo
echo "verifying $SITE"
sleep 10
fail=0
for path in "" "privacy.html" "terms.html"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 25 "$SITE/$path")
  printf "  %-14s %s\n" "/${path}" "$code"
  [ "$code" = "200" ] || fail=1
done

# The root returning 200 is not enough: when this breaks, it breaks by serving
# the source file with a 200.
if curl -s -m 25 "$SITE/" | head -c 40 | grep -q "<!DOCTYPE html>"; then
  echo "  root is HTML   ok"
else
  echo "  root is NOT HTML — serving source, deploy is broken"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "DEPLOY VERIFICATION FAILED — the site is not serving correctly."
  exit 1
fi
echo
echo "Deploy verified."
