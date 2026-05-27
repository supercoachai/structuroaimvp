#!/usr/bin/env bash
# Eenmalig / bij deploy: voer de Supabase-migratie uit die legacy tabellen samenvoegt.
# Vereist: supabase CLI gelinkt aan project, of plak SQL handmatig in SQL Editor.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "→ Migratie: supabase/migrations/20260527120000_unify_waitlist_tables.sql"
echo "  Voer uit met: supabase db push"
echo "  Of kopieer het bestand naar Supabase Dashboard → SQL Editor."
