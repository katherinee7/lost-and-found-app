# Accounts

Users can [register](reaction:Accounts.Register) an account,
[log in](reaction:Accounts.Login),
[resolve their session](reaction:Accounts.Current),
and [log out](reaction:Accounts.Logout).

Registration creates an account without logging it in.
Login creates a session. Logout invalidates that session.

```endpoints
Accounts.Register at /auth/register
Accounts.Login at /auth/login
Accounts.Current at /auth/current
Accounts.Logout at /auth/logout
```
