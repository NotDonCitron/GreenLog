---
name: ssh-connect
version: 2026-01-01
triggers: ["ssh", "connect to server", "server connection", "remote connection"]
tools: [bash]
constraints: ["never run destructive commands without explicit confirmation"]
---

# SSH Connect — connect to a remote server

## Usage

When user provides an SSH connection string (e.g., `ssh root@31.97.77.89`):

1. Parse the connection string: `ssh [user]@[host]`
2. Execute: `ssh [user]@[host]`

## Connection String Format

Expected format: `ssh root@31.97.77.89`
- First token: `ssh` literal
- Second token: `user@host` pair

## Examples

**User says:** `ssh root@31.97.77.89`
**Action:** Run `ssh root@31.97.77.89` in the terminal

**User says:** `connect via ssh to user@192.168.1.1`
**Action:** Run `ssh user@192.168.1.1`

## Notes

- This skill opens an interactive SSH session
- The session blocks until the user disconnects from the remote server
- Use this when user explicitly asks to connect via SSH

## Self-rewrite hook

After using this skill 3 times, check if a persistent connection helper or config management approach would be useful.