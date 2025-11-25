#!/bin/bash
# Script to repair migration history by marking all remote migrations as reverted

echo "Repairing migration history..."
echo "This will mark all remote migrations as reverted (not present locally)"

supabase migration repair --status reverted 20250906081045
supabase migration repair --status reverted 20250906081250
supabase migration repair --status reverted 20250906082837
supabase migration repair --status reverted 20250906083353
supabase migration repair --status reverted 20250906083527
supabase migration repair --status reverted 20250906083639
supabase migration repair --status reverted 20250906083654
supabase migration repair --status reverted 20250906083727
supabase migration repair --status reverted 20250906083829
supabase migration repair --status reverted 20250906084220
supabase migration repair --status reverted 20250906084353
supabase migration repair --status reverted 20250906084408
supabase migration repair --status reverted 20250906084434
supabase migration repair --status reverted 20250906090826
supabase migration repair --status reverted 20250906092603
supabase migration repair --status reverted 20250906092640
supabase migration repair --status reverted 20250906110950
supabase migration repair --status reverted 20250906113306

echo "Partial repair done. Checking if we can now pull..."
supabase db pull --linked
