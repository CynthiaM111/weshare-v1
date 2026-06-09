#!/usr/bin/env bash
# Grant super-admin to founding team phones (run after they sign up once).
#
# Usage:
#   ./supabase/scripts/set-super-admins.sh +2507XXXXXXXX +2507XXXXXXXX +2507XXXXXXXX
#
# Requires: supabase CLI linked to project, DATABASE_URL or supabase db execute.

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <phone-e164> [phone-e164 ...]" >&2
  echo "Example: $0 +250788123456 +250789123456 +250787123456" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SQL=""
for phone in "$@"; do
  escaped="${phone//\'/\'\'}"
  SQL+="SELECT public.set_super_admin_by_phone('${escaped}', true);"$'\n'
done

echo "Setting super-admin for: $*"
echo "$SQL" | supabase db execute --linked

echo "Done. Founders should sign out/in to refresh profile.is_super_admin in the app."
