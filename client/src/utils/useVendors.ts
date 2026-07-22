import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Vendor } from "../types";

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    return api.vendors
      .list()
      .then(setVendors)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  return { vendors, loading, reload };
}
