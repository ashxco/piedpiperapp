/** Kept for client lifecycle compatibility. No trace exporter is installed. */
export interface ClientTracingConfig {
  readonly exportIntervalMs?: number;
}
export function configureClientTracing(_config: ClientTracingConfig = {}): Promise<void> {
  return Promise.resolve();
}
