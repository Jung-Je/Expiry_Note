"""Shared Supabase client accessors.

Two clients are exposed, matching the two Supabase API keys:

- `get_supabase_client()` uses the anon key. Row Level Security applies,
  same as a request from the web/mobile client would see.
- `get_supabase_admin_client()` uses the service role key and bypasses
  Row Level Security. Use it only for trusted, server-side operations
  (e.g. Auth admin actions, background jobs) — never expose results or
  the key itself to end users.
"""

from functools import lru_cache

from django.conf import settings
from supabase import Client, create_client


@lru_cache
def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


@lru_cache
def get_supabase_admin_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
