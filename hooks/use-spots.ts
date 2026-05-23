"use client";

import { useEffect, useState } from "react";
import { supabase, type Spot } from "@/lib/supabase";

export function useSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpots() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("spots")
        .select("*")
        .order("no", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setSpots([]);
      } else {
        setSpots((data ?? []) as Spot[]);
      }

      setLoading(false);
    }

    fetchSpots();

    return () => {
      cancelled = true;
    };
  }, []);

  return { spots, loading, error };
}
