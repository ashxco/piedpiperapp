# Mobile dependencies

The committed Enriched Markdown and Screens archives pin the native integrations used by Pied Piper. Each archive includes a source record identifying the original dependency repository, source revision, and upstream base. These records describe third-party source provenance; they are not product branding.

To update either dependency, start from its recorded source revision, apply and commit the required changes, then build and pack it from a clean checkout. Preserve its license and source record. Update the archive path in `apps/mobile/package.json`, refresh the lockfile with `vp install`, and verify mobile types and the affected features. Rebuild native clients whenever native source changes.
