import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import { dual } from "effect/Function";

import { compactMetricAttributes, outcomeFromExit } from "./Attributes.ts";

export const rpcRequestsTotal = Metric.counter("piedpiperapp_rpc_requests_total", {
  description: "Total RPC requests handled by the websocket RPC server.",
});

export const rpcRequestDuration = Metric.timer("piedpiperapp_rpc_request_duration", {
  description: "RPC request handling duration.",
});

export const orchestrationEffectClaimsTotal = Metric.counter(
  "piedpiperapp_orchestration_effect_claims_total",
  {
    description: "Total completed orchestration effect outbox claim attempts by result.",
  },
);

export const orchestrationEffectQueueWait = Metric.timer(
  "piedpiperapp_orchestration_effect_queue_wait",
  {
    description:
      "Time from an orchestration effect's temporal availability until claim, including same-thread blocking.",
  },
);

export const providerSessionsTotal = Metric.counter("piedpiperapp_provider_sessions_total", {
  description: "Total provider session lifecycle operations.",
});

export const providerTurnsTotal = Metric.counter("piedpiperapp_provider_turns_total", {
  description: "Total provider turn lifecycle operations.",
});

export const providerTurnDuration = Metric.timer("piedpiperapp_provider_turn_duration", {
  description: "Time for the provider adapter to start a turn, not how long the turn runs.",
});

export const gitCommandsTotal = Metric.counter("piedpiperapp_git_commands_total", {
  description: "Total git commands executed by the server runtime.",
});

export const gitCommandDuration = Metric.timer("piedpiperapp_git_command_duration", {
  description: "Git command execution duration.",
});

export const terminalSessionsTotal = Metric.counter("piedpiperapp_terminal_sessions_total", {
  description: "Total terminal sessions started.",
});

export const terminalRestartsTotal = Metric.counter("piedpiperapp_terminal_restarts_total", {
  description: "Total terminal restart requests handled.",
});

/**
 * One per webhook request that reached a task, by `outcome` (accepted,
 * not_found, rejected_signature, disabled, rate_limited, queue_full, expired,
 * prompt_too_long, error) and `source` (relay or direct).
 */
export const webhookDeliveriesTotal = Metric.counter("piedpiperapp_webhook_deliveries_total", {
  description: "Webhook requests handled, by outcome and source.",
});

export const webhookDeliveryDuration = Metric.timer("piedpiperapp_webhook_delivery_duration", {
  description: "Time to verify, log, and enqueue one webhook request.",
});

/** How long a relay-held request waited before this environment got it. */
export const webhookHeldDelay = Metric.timer("piedpiperapp_webhook_held_delay", {
  description:
    "Time between the relay receiving a webhook request and the environment handling it.",
});

/** Runs started by webhook deliveries, by `outcome` (started, skipped, failed). */
export const webhookRunsTotal = Metric.counter("piedpiperapp_webhook_runs_total", {
  description: "Runs started from webhook deliveries, by outcome.",
});

/** Secrets agents asked users for, by how each ended: saved, declined, cancelled, timed_out. */
export const secretRequestsTotal = Metric.counter("piedpiperapp_secret_requests_total", {
  description: "Secrets agents asked users for, by how each request ended.",
});

/** One-use secret refs a tool tried to use, by result: used, rejected. */
export const secretRefsConsumedTotal = Metric.counter("piedpiperapp_secret_refs_consumed_total", {
  description: "Secret refs tools tried to use, by result.",
});

export const metricAttributes = (
  attributes: Readonly<Record<string, unknown>>,
): ReadonlyArray<[string, string]> => Object.entries(compactMetricAttributes(attributes));

export const increment = (
  _metric: Metric.Metric<number, unknown>,
  _attributes: Readonly<Record<string, unknown>>,
  _amount = 1,
) => Effect.void;

export interface WithMetricsOptions {
  readonly counter?: Metric.Metric<number, unknown>;
  readonly timer?: Metric.Metric<Duration.Duration, unknown>;
  readonly attributes?:
    | Readonly<Record<string, unknown>>
    | (() => Readonly<Record<string, unknown>>);
  readonly outcomeAttributes?: (
    outcome: ReturnType<typeof outcomeFromExit>,
  ) => Readonly<Record<string, unknown>>;
}

// Preserve operation results without recording counters, timings, or attributes.
const withMetricsImpl = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  _options: WithMetricsOptions,
): Effect.Effect<A, E, R> => effect;

export const withMetrics: {
  (
    options: WithMetricsOptions,
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: WithMetricsOptions): Effect.Effect<A, E, R>;
} = dual(2, withMetricsImpl);
