import {
  createPullRequestEnvironmentAtoms,
  createPullRequestStackAtomFamily,
} from "@piedpiperapp/client-runtime/state/pull-requests";
import { connectionAtomRuntime } from "../connection/runtime";

export const composerPullRequests = createPullRequestEnvironmentAtoms(connectionAtomRuntime);
export const pullRequestStackAtom = createPullRequestStackAtomFamily(
  connectionAtomRuntime,
  composerPullRequests.refreshes,
);
