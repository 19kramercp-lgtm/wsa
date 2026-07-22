import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Client } from "../types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    return api.clients
      .list()
      .then(setClients)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  return { clients, loading, reload };
}
