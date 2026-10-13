import * as Layer from "effect/Layer";
import * as References from "effect/References";
import * as ServerLogger from "../serverLogger.ts";

// Keep operational console logs; do not record or export traces or metrics.
export const layer = Layer.mergeAll(
  ServerLogger.layer,
  Layer.succeed(References.TracerEnabled, false),
  Layer.succeed(References.TracerTimingEnabled, false),
);
