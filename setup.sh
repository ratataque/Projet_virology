#!/bin/bash
# Setup and Build Script for C2 POC

set -e  # Exit on error

echo "=========================================="
echo "C2 POC - Setup & Build"
echo "=========================================="
echo ""

# Step 1: Check/Create .env
if [ ! -f .env ]; then
    echo "[1/5] Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your credentials"
    echo "    1. Create GitHub Personal Access Token (with 'gist' scope)"
    echo "       → https://github.com/settings/tokens"
    echo "    2. Create a new Gist at https://gist.github.com/"
    echo "    3. Edit .env and add:"
    echo "       GITHUB_TOKEN=your_token"
    echo "       GIST_ID=your_gist_id"
    echo ""
    echo "Then run this script again: ./setup.sh"
    echo ""
    exit 1
else
    echo "[1/5] .env file found ✓"
fi

# Validate .env has required values
if grep -q "your_github_token_here" .env || grep -q "your_gist_id_here" .env; then
    echo ""
    echo "⚠️  Please edit .env with your actual credentials"
    echo "    Open .env and replace:"
    echo "    - your_github_token_here"
    echo "    - your_gist_id_here"
    echo ""
    exit 1
fi

# Step 2: Generate keys
if [ ! -f private_key.pem ] || [ ! -f public_key.pem ] || [ ! -f aes_key.txt ]; then
    echo "[2/5] Generating encryption keys..."
    python3 generate_keys.py
else
    echo "[2/5] Encryption keys already exist ✓"
fi

# Step 3: Install Python dependencies
echo "[3/5] Installing Python dependencies..."
if pip3 install -r requirements.txt --quiet 2>/dev/null; then
    echo "     Dependencies installed ✓"
elif pip3 list | grep -q "python-dotenv\|cryptography\|requests"; then
    echo "     Dependencies already installed ✓"
else
    echo "     ⚠️  Could not install dependencies"
    echo "     Install manually: pip3 install -r requirements.txt"
fi

# Step 4: Copy config files to agent directory
echo "[4/5] Copying config files to agent directory..."
cp .env public_key.pem aes_key.txt c2_agent/
echo "     Config files copied ✓"

# Step 5: Build agent
echo "[5/5] Building Rust agent..."
cd c2_agent
cargo build --release --quiet 2>/dev/null || cargo build --release
cd ..

if [ -f c2_agent/target/release/c2_agent ]; then
    echo "     Agent built successfully ✓"
else
    echo "     ✗ Build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Agent binary: c2_agent/target/release/c2_agent"
echo ""
echo "Run in separate terminals:"
echo ""
echo "  Terminal 1 (Agent):"
echo "    cd c2_agent && ./target/release/c2_agent"
echo ""
echo "  Terminal 2 (Controller):"
echo "    python3 controller.py"
echo ""
echo "Agent reads configuration from:"
echo "  • .env (credentials)"
echo "  • public_key.pem (RSA public key)"
echo "  • aes_key.txt (AES-256 key)"
echo ""
echo "=========================================="
