import { useState } from "react";
import { AuthOrchestrationOperateScope } from "@piedpiperapp/contracts";
import { useEnvironmentScope } from "../../state/session";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@piedpiperapp/client-runtime/state/runtime";
import { useOpenInPreferredEditor } from "../../editorPreferences";
import { Button } from "../ui/button";
import { SettingsPageContainer, SettingsSection } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";

export function DiagnosticsSettingsPanel() {
  const { environment } = useSettingsScope();
  const environmentId = environment?.environmentId ?? null;
  const logsDirectory = environment?.serverConfig?.observability.logsDirectoryPath;
  const canOpenLogs = useEnvironmentScope(environmentId, AuthOrchestrationOperateScope);
  const openInEditor = useOpenInPreferredEditor(
    environmentId,
    environment?.serverConfig?.availableEditors ?? [],
  );
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openLogs = async () => {
    if (!canOpenLogs || !logsDirectory) return;
    setOpening(true);
    setError(null);
    try {
      const result = await openInEditor(logsDirectory);
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        const cause = squashAtomCommandFailure(result);
        setError(cause instanceof Error ? cause.message : "Unable to open logs folder.");
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <SettingsPageContainer width="expanded" className="gap-10">
      <SettingsSection title="Privacy">
        <p className="text-sm text-muted-foreground">
          Pied Piper does not collect product analytics or process telemetry. Diagnostic traces,
          metrics, and logs are never exported. Environment variables and saved exporter settings
          cannot turn telemetry on.
        </p>
      </SettingsSection>
      <SettingsSection title="Local logs">
        <p className="text-sm text-muted-foreground">
          Operational logs and failure reports stay on the environment that created them.
        </p>
        {logsDirectory ? (
          <p className="break-all font-mono text-xs text-muted-foreground">{logsDirectory}</p>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={!canOpenLogs || !logsDirectory || opening}
          onClick={() => void openLogs()}
        >
          {opening ? "Opening…" : "Open logs folder"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </SettingsSection>
    </SettingsPageContainer>
  );
}
