#!/bin/bash
# Setup script for trusted HTTPS certificates using mkcert
# This eliminates the "Your connection is not private" warning

echo "Setting up trusted HTTPS certificates for localhost..."

# Install local CA (requires admin password)
echo "Installing local CA (you'll be prompted for your password)..."
mkcert -install

# Create certificates directory
mkdir -p .cert

# Generate certificates for localhost
echo "Generating certificates for localhost..."
cd .cert
mkcert localhost 127.0.0.1 ::1

echo ""
echo "✅ Certificates created successfully!"
echo "📁 Certificates are in: frontend/.cert/"
echo "🔒 Certificate: .cert/localhost+2.pem"
echo "🔑 Key: .cert/localhost+2-key.pem"
echo ""
echo "Next step: Update vite.config.ts to use these certificates"



