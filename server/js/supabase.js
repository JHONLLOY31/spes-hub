import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  'https://lxyyhhwjiucmziuzzohd.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_FMM4oygPbtCQ_MJVka9xwQ_e3W1GNGa';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);