# Production launch checklist

- [ ] Run `npm run typecheck`, `npm test`, `npm run build` successfully on the exact deployed commit.
- [ ] Backup/branch Neon; review and apply only missing migrations.
- [ ] Rotate every previously exposed Neon credential, API key and session secret.
- [ ] Confirm `.env.local` is ignored and no secrets appear in Git history.
- [ ] Set `ENABLE_DEMO_WRITES=false` in production and verify `/api/simulate` returns 403.
- [ ] Verify auth routes, origin validation, API key revocation, and 32 KiB event payload limit.
- [ ] Test organization isolation with two independent accounts and applications.
- [ ] Confirm security events/incident detection from ATLAS and webhook delivery if configured.
- [ ] Add operational monitoring, backups, incident response and database capacity alerts.
- [ ] Configure webhook egress allowlisting or disable outbound webhooks.
- [ ] Decide on public signup policy; add email verification, password reset and MFA before accepting external users.
- [ ] Conduct a security review / penetration test before marketing as a production security service.
