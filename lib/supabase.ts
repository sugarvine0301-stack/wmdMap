import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Spot = {
  id: string;
  no: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

export type Topography = {
  id: string;
  no: number;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
};
