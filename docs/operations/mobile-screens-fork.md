# Building the mobile Screens dependency

Pied Piper uses the committed Screens archive in `apps/mobile/deps`. The archive includes compiled JavaScript, declarations, native source, and an embedded dependency provenance record with the exact source revision and upstream base.

Reproduce the archive from a clean checkout of that recorded revision using Node 24 and the dependency repository's pinned Yarn. For an update, commit the native integration changes, increment the dependency version, and preserve its license and source provenance. Pack the checkout, replace the archive, update `apps/mobile/package.json`, and run `vp install` to refresh the lockfile. Verify mobile types and affected navigation tests, then rebuild and test the native client.

The same iOS binary supports iPhone, iPad, and Duo. UIKit hinge updates enable phone workspace columns at runtime; regular phones retain portrait rotation. Duo support requires a binary built with the iOS 27.1 SDK; an OTA cannot add the native APIs.
