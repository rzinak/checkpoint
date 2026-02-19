# Checkpoint

**Never lose your game progress again.**

Checkpoint is a save game backup tool for local games. Create timestamped backups (snapshots) of your save files, switch between different saves instantly, and protect your progress from corruption or accidents.

## Features

- **One-Click Snapshots** - Create timestamped backups with a single click
- **Instant Restore** - Switch between saves in seconds  
- **Google Drive Cloud Backup** - Back up saves to your own Google Drive
- **100% Private** - Your data stays on your device. We have zero access to your saves or Google Drive
- **Smart Protection** - Automatically backs up current save before restoring
- **Process Detection** - Prevents restore while game is running
- **Cross-Platform** - Windows and Linux support

## Your Data, Your Control

Checkpoint is built with privacy as the foundation:

- **No Account Required** - Use locally without creating any account
- **Zero Server Access** - We don't have servers, we can't see your saves
- **Google Drive = Your Drive** - Cloud backups go directly to your personal Google Drive, not our servers
- **Local-First** - Everything works offline. Cloud is optional
- **Open Source** - Full transparency. Check the code yourself

## Download

### Windows
- Download the `.exe` installer

### Linux
- **Ubuntu/Debian**: `checkpoint_0.1.0_amd64.deb`
- **Fedora**: `checkpoint-0.1.0-1.x86_64.rpm`  
- **Universal**: AppImage works on any distro

[View All Releases](https://github.com/rzinak/checkpoint/releases)

## Quick Start

1. **Add Your First Game**
   - Click "Add game" button
   - Enter game name
   - Select save folder location
   - Click "Add game"

2. **Create a Snapshot**
   - Click on your game card
   - Click "Create Snapshot"
   - Give it a name (e.g. "Before Boss Fight")
   - Choose backup destination: Local or Local and cloud

3. **Restore a Save**
   - Click the restore button on any snapshot
   - Current save is automatically backed up first
   - Game must not be running

4. **Enable Cloud Backup** (Optional)
   - Sign in with Google in the profile section
   - Set backup destination to "Cloud" or "Both"
   - Snapshots automatically upload to your Google Drive
   - Access your saves from any device

## How Cloud Backup Works

- **Your Google Drive**: Backups are stored in a hidden app folder in your Google Drive (appDataFolder)
- **Not Visible**: These files don't clutter your main Drive view
- **Private**: Only this app can access them
- **Cross-Device**: Log in on another computer to access your cloud saves
- **Manual Control**: You choose when to upload. No automatic syncing.

## System Requirements

- **Windows**: Windows 10 or later
- **Linux**: Any modern distro with GTK3

## Support

- **Documentation**: [Full Documentation](https://checkpoint-save.vercel.app/documentation/index.html)
- **Issues**: [GitHub Issues](https://github.com/rzinak/checkpoint/issues)
- **Website**: [checkpoint-save.vercel.app](https://checkpoint-save.vercel.app/index.html)

## License

MIT License - Open source, free forever

## Contributing

Contributions welcome! See the [Developer Documentation](https://checkpoint-save.vercel.app/documentation/index.html) for technical details.
