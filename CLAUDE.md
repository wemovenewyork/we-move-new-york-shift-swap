@AGENTS.md

## Secrets — standing rules

- neonctl `branches create` (and some other neonctl commands) print
  connection strings with passwords in their default output. Never run
  neonctl commands with unfiltered output; redirect or filter anything
  that can contain a connection string.
- Never print, echo, cat, or log .env contents or any connection string.
  Write secrets via pipes/redirects only; verify blind with grep -c.
