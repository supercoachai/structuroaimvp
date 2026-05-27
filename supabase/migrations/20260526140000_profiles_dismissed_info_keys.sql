ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dismissed_info_keys text[] DEFAULT '{}';
