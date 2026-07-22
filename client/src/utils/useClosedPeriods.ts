import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ClosedPeriod } from "../types";

export function useClosedPeriods() {
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);

  useEffect(() => {
    api.periods.list().then(setClosedPeriods).catch(() => undefined);
  }, []);

  return closedPeriods;
}
