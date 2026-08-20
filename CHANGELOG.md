# Changelog

## 0.2.0-r1

- Use the public `safeshield` ubus management API as the only SafeShield control plane.
- Remove direct LuCI UCI writes for SafeShield lifecycle, license and configuration.
- Add enable/disable and manual refresh actions to Overview.
- Show local-rule apply timestamps and the current fast-apply state from `safeshield.status`.
- Add a Local Rules page backed by `rules_list`, `rule_add` and `rule_delete`.
- Wait for `last_local_apply` / `last_local_apply_failure` after rule mutations so the UI distinguishes file persistence from active DNS application.
- Stop exposing obsolete/non-public options such as local rule paths and dnsmasq file/instance settings.
- Fix physical fingerprint fields to match the current SafeShield status schema.
- Require SafeShield 0.3.10 or newer.
