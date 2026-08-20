# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Open Agent Engine seriously. If you believe you have found a security vulnerability, please do NOT create a public issue.

Instead, please report security vulnerabilities privately to:
- **Email**: jedmamosto@gmail.com
- **GitHub Security Advisories**: Report privately via GitHub repository Security tab.

Please include:
1. Type of issue (e.g. command injection, directory traversal, prototype pollution).
2. Step-by-step instructions to reproduce the issue.
We will acknowledge receipt of your vulnerability report within 48 hours and provide regular status updates on resolution.

---

## Branch Security & Supply Chain Protection

To ensure code integrity and protect the codebase against unvetted or malicious modifications:

1. **Active Repository Ruleset (`Protect main branch`)**:
   - Direct push to the `main` branch is disabled for all contributors.
   - All proposed modifications must pass through a Pull Request.
   - Merging to `main` requires a minimum of **1 approving review** and thread resolution.
   - Force pushes (`git push --force`) and branch deletions on `main` are blocked.
   - Stale reviews are automatically invalidated whenever new commits are pushed to an open PR.
2. **Access & Bypass Control**:
   - Bypass privileges are strictly restricted to repository administrators.
   - Admin bypass is reserved for emergencies, hotfixes, or synchronized release operations.
