import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wouxylsgloshpcbscjoy.supabase.co'
const supabaseAnonKey = 'sb_publishable_vACYOMJVQ_GjNoblV5hDcA_L2bkwUQt'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
