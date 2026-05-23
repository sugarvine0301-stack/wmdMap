"use client";

import { useEffect, useState } from "react";
import { supabase, type Topography } from "@/lib/supabase";

export function useTopography() {
  const [topography, setTopography] = useState<Topography[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTopography() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("topography")
        .select("*")
        .order("no", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTopography([]);
      } else {
        setTopography((data ?? []) as Topography[]);
      }

      setLoading(false);
    }

    fetchTopography();

    return () => {
      cancelled = true;
    };
  }, []);

  return { topography, loading, error };
}
