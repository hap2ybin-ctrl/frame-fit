#!/usr/bin/env bash
# GitHub Pages 배포: 정적 사이트로 빌드한 out/ 을 gh-pages 브랜치에 강제 푸시합니다.
# 사용법: npm run deploy:pages   (origin 원격 저장소가 설정되어 있어야 함)
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE_URL="$(git remote get-url origin)"
REPO_NAME="$(basename -s .git "$REMOTE_URL")"

rm -rf out
DEPLOY_TARGET=gh-pages PAGES_BASE_PATH="/${REPO_NAME}" npm run build
# _next 폴더가 Jekyll에 의해 무시되지 않도록
touch out/.nojekyll

TMP="$(mktemp -d)"
cp -R out/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name || echo deploy)" \
    -c user.email="$(git -C "$OLDPWD" config user.email || echo deploy@localhost)" \
    commit -q -m "Deploy $(git -C "$OLDPWD" rev-parse --short HEAD)"
git push -f -q "$REMOTE_URL" gh-pages
cd - >/dev/null
rm -rf "$TMP"
echo "gh-pages 브랜치에 배포했습니다."
