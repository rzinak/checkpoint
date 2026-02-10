#!/bin/bash
# Register checkpoint:// protocol handler for development

echo "Registering checkpoint:// protocol handler..."

# Create desktop entry for development
DESKTOP_ENTRY="$HOME/.local/share/applications/checkpoint-dev.desktop"

mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_ENTRY" << 'EOF'
[Desktop Entry]
Name=Checkpoint (Dev)
Exec=bash -c 'cd /home/ren/fun/checkpoint && npm run tauri dev'
Type=Application
Terminal=false
MimeType=x-scheme-handler/checkpoint;
EOF

# Register the protocol handler
xdg-mime default checkpoint-dev.desktop x-scheme-handler/checkpoint

echo "✅ Protocol handler registered!"
echo "You may need to log out and back in for changes to take effect."
echo ""
echo "To test:"
echo "1. Run: npm run tauri dev"
echo "2. Click login and authenticate with Google"
echo "3. When browser shows 'Open Checkpoint', click it"
echo "4. The app should receive the login!"
