# Checkpoint

A save game backup tool for local games. Built with Tauri, React, and Rust.

## Features

- **Game Management**: Add games with their save locations
- **Snapshots**: Create timestamped backups of your save games
- **Restore**: Restore any snapshot with automatic backup of current save
- **Process Detection**: Prevents restore while game is running
- **Cross-Platform**: Works on Windows, Linux, and macOS

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **UI Components**: Lucide React icons
- **Process Checking**: sysinfo crate

## Prerequisites

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  pkg-config \
  build-essential
```

### Linux (Fedora)

```bash
sudo dnf install -y \
  gtk3-devel \
  webkit2gtk4.1-devel \
  libayatana-appindicator-gtk3-devel \
  librsvg2-devel \
  patchelf \
  pkgconf-pkg-config \
  gcc-c++
```

### Linux (Arch)

```bash
sudo pacman -S --needed \
  gtk3 \
  webkit2gtk-4.1 \
  libayatana-appindicator \
  librsvg \
  patchelf \
  pkgconf \
  base-devel
```

### Windows

No additional dependencies needed. Just install:
- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/)

### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install
```

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd checkpoint

# Install dependencies
npm install

# Run in development mode
npm run tauri-dev

# Build for production
npm run tauri-build
```

## Building Binaries

Builds are platform-specific. Run the build command on the target platform:

```bash
npm run tauri-build
```

Binaries will be in `src-tauri/target/release/bundle/`

### Linux Output
- `.deb` package
- `.rpm` package
- Binary executable

### Windows Output
- `.exe` installer
- `.msi` installer

### macOS Output
- `.app` bundle
- `.dmg` installer

To build for multiple platforms, use GitHub Actions or build on each platform separately.

## Usage

1. **Add a Game**: Click the + button and enter:
   - Game name (e.g., "NBA 2K16")
   - Save location (e.g., `/home/user/Documents/Games/.../3DMGAME`)
   - Executable name (optional, for process checking)

2. **Create Snapshot**: Select a game and click "Create Snapshot"

3. **Restore**: Select a snapshot and click the restore button
   - Current save will be backed up automatically before restoring
   - Restore is blocked if the game is running

4. **Settings**: Change backup location in the settings page

## Directory Structure

```
checkpoint/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── lib/               # API and types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source files
│   ├── capabilities/      # Tauri permissions
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Node.js dependencies
```

## Configuration

Configuration is stored in:
- **Linux/macOS**: `~/.config/checkpoint/config.json`
- **Windows**: `%APPDATA%\checkpoint\config.json`

Backups are stored in `~/checkpoint/` by default (configurable in settings).

## Testing with NBA 2K16

For testing with NBA 2K16:

**Save Location**: `/home/ren/Documents/Games/NBiiiA-2K16-SteamRIP.com/NBA 2K16/3DMGAME`

**Executable**: `NBA2K16.exe`

**Test Flow**:
1. Add the game with the path above
2. Create a snapshot
3. Play the game and make progress
4. Restore the snapshot - your current save will be backed up automatically first

## Development Notes

### Interface Naming

React interfaces use snake_case to match Rust structs:
- `game_id` (not `gameId`)
- `save_location` (not `saveLocation`)
- `exe_name` (not `exeName`)
- `created_at` (not `createdAt`)

This ensures proper serialization between TypeScript and Rust.

### Permissions

The app uses Tauri v2's capability system for security. Permissions are defined in `src-tauri/capabilities/main.json`:
- File system access (read/write in home directory)
- Dialog access (folder picker)
- Process access (checking if game is running)

## Troubleshooting

### Build fails with missing system libraries

Make sure you installed all prerequisites for your platform (see Prerequisites section above).

### App crashes on startup

Check the terminal output for errors. Common issues:
- Missing permissions in capabilities
- Incorrect plugin configuration

### Cannot select folder in dialog

Ensure the dialog permissions are properly configured in `capabilities/main.json`.

## License

MIT License - Open source project

## Contributing

Contributions are welcome. Please ensure:
- Code follows the existing style
- TypeScript interfaces match Rust struct names (snake_case)
- Test on your local setup before submitting
