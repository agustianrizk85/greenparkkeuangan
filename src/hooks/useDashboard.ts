import { useCallback, useEffect, useState } from "react";
import { api, AuthError } from "../api/client";
import { toMap } from "../lib/status";
import type { DashboardData } from "../types";

type State =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: DashboardData; error: null }
  | { status: "error"; data: null; error: string };

/**
 * Fetch the dashboard payload and enrich it with meta lookup maps. If the
 * session expires (401), the optional onAuthError callback fires so the app can
 * drop back to the login screen.
 */
export function useDashboard(onAuthError?: () => void): [State, () => void] {
  const [state, setState] = useState<State>({ status: "loading", data: null, error: null });

  const load = useCallback(() => {
    // Keep showing current data during a refresh (e.g. after a master-data
    // edit) so the view doesn't flash back to the loading splash.
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading", data: null, error: null }));
    api
      .dashboard()
      .then((d) => {
        const enriched: DashboardData = {
          ...d,
          receivableTypeMap: toMap(d.receivableType),
          agingMap: toMap(d.agingMeta),
          priorityMap: toMap(d.priorityMeta),
        };
        setState({ status: "ready", data: enriched, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof AuthError) {
          onAuthError?.();
          return;
        }
        setState({ status: "error", data: null, error: err instanceof Error ? err.message : String(err) });
      });
  }, [onAuthError]);

  useEffect(load, [load]);
  return [state, load];
}
