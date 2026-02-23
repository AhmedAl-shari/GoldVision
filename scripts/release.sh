#!/bin/bash
# GoldVision Release Script

set -e

VERSION=${1:-"1.0.0"}
RELEASE_NOTES=${2:-"GoldVision v${VERSION} release"}

echo "🚀 Creating release v${VERSION}..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Check if version already exists
if git tag -l | grep -q "^v${VERSION}$"; then
    echo "❌ Tag v${VERSION} already exists"
    exit 1
fi

echo "📋 Pre-release checks..."

# Check required files exist
if [ ! -f "CHANGELOG.md" ]; then
    echo "❌ CHANGELOG.md not found"
    exit 1
fi

if [ ! -f "LICENSE" ]; then
    echo "❌ LICENSE not found"
    exit 1
fi

echo "✅ Pre-release checks passed"

# Create artifacts
echo "📦 Collecting evidence..."
make evidence

# Build Docker images
echo "🐳 Building Docker images..."
make docker:build

# Create git tag
echo "🏷️  Creating git tag v${VERSION}..."
git tag -a "v${VERSION}" -m "${RELEASE_NOTES}"

# Push tag
echo "📤 Pushing tag to remote..."
git push origin "v${VERSION}"

# Create release directory
RELEASE_DIR="releases/v${VERSION}"
mkdir -p "$RELEASE_DIR"

# Copy artifacts
echo "📁 Copying artifacts..."
cp -r artifacts "$RELEASE_DIR/"

# Copy Docker images (if available)
if command -v docker &> /dev/null; then
    echo "💾 Saving Docker images..."
    docker save goldvision-frontend:latest | gzip > "$RELEASE_DIR/goldvision-frontend.tar.gz"
    docker save goldvision-backend:latest | gzip > "$RELEASE_DIR/goldvision-backend.tar.gz"
fi

# Create release notes
cat > "$RELEASE_DIR/RELEASE_NOTES.md" << EOF
# GoldVision v${VERSION} Release

## Release Date
$(date)

## What's New
- Evidence collection and artifact management
- RBAC testing and rate limiting
- Performance testing and monitoring
- Enhanced admin dashboard
- Token rotation and security improvements
- Comprehensive Makefile support

## Artifacts
- \`artifacts/\` - API evidence and test results
- \`goldvision-frontend.tar.gz\` - Frontend Docker image
- \`goldvision-backend.tar.gz\` - Backend Docker image

## Installation
\`\`\`bash
# Load Docker images
docker load < goldvision-frontend.tar.gz
docker load < goldvision-backend.tar.gz

# Run with Docker Compose
docker-compose up -d
\`\`\`

## Evidence
See the \`artifacts/\` directory for:
- API health checks
- RBAC test results
- Performance metrics
- System monitoring data
EOF

# Create checksums
echo "🔐 Creating checksums..."
cd "$RELEASE_DIR"
find . -type f -name "*.tar.gz" -o -name "*.json" -o -name "*.txt" | xargs sha256sum > checksums.txt
cd ..

echo "✅ Release v${VERSION} created successfully!"
echo "📁 Release files: $RELEASE_DIR"
echo "🏷️  Git tag: v${VERSION}"

# Display release summary
echo ""
echo "📊 Release Summary:"
echo "=================="
echo "Version: v${VERSION}"
echo "Date: $(date)"
echo "Artifacts: $(find "$RELEASE_DIR/artifacts" -type f | wc -l) files"
echo "Docker Images: $(ls "$RELEASE_DIR"/*.tar.gz 2>/dev/null | wc -l) images"
echo "Checksums: $RELEASE_DIR/checksums.txt"

echo ""
echo "🎉 Release complete! Next steps:"
echo "1. Review the release artifacts in $RELEASE_DIR"
echo "2. Upload artifacts to your preferred storage"
echo "3. Update deployment configurations"
echo "4. Notify stakeholders of the new release"
