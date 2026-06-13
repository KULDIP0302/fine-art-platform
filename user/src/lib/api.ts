// ✅ proxy use karega (vite)
const API_BASE = 'https://fine-art-platform.onrender.com';

// 🔐 TOKEN GETTER
function getToken(): string | null {
  return localStorage.getItem('userToken');
}

// 🚀 MAIN API FUNCTION
export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  try {
    const { token, ...rest } = options;

    const headers: Record<string, string> = {
      ...(rest.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(rest.headers as Record<string, string> || {}),
    };

    const authToken = token || getToken();

    // 🔥 FINAL FIX: ALWAYS SEND TOKEN (agar available ho)
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('API ERROR RESPONSE:', data);
      const err = new Error(
        (data as { message?: string }).message || 'API request failed'
      ) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    return data as T;

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('API Error:', msg);
    throw error;
  }
}