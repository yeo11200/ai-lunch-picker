import { createClient } from '@supabase/supabase-js';

const SUPABASE_FETCH_TIMEOUT_MS = 3000;

// supabase-js 기본 fetch에는 timeout이 없어서 DNS ENOTFOUND/hang 시 페이지가 10초 이상 응답을 못 한다.
// AbortController로 3초 timeout을 강제해서 빠르게 실패시키고 memory fallback으로 떨어지게 한다.
const handleTimeoutFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const userSignal = init?.signal;

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener('abort', () => controller.abort(userSignal.reason), { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(new Error('supabase fetch timeout')), SUPABASE_FETCH_TIMEOUT_MS);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};

export const handleCreateSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serverKey) {
    return null;
  }

  return createClient(supabaseUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: handleTimeoutFetch,
    },
  });
};
