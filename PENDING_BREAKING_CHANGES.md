# Pending Breaking Changes

This is a running list of breaking changes that would improve the library but are not worth a major release by themselves. Each entry also records the workaround currently in place, so the workaround can be removed when the change is finally made.

When this list gets long, or when a change comes along that justifies a major release on its own, implement every entry here in that release, remove its workarounds, and then delete the entry.

## Entry format

Each entry has a `##` heading naming the change, followed by these sections:

- **Problem**: What is wrong with the current design.
- **Breaking change**: The change that fixes it, and what it breaks for users.
- **Current workaround**: What was done instead to avoid the major release, with the files and symbols involved.
- **Reverting the workaround**: What to remove or simplify once the breaking change is made.

---

There are no pending breaking changes.
