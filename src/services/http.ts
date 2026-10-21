/** Utilitários HTTP com timeout curto (zero dependências). */

export type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export const APP_USER_AGENT = 'FujaDoSol/1.0 (iOS; https://fujadosol.app)';

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Tempo esgotado após ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

/** GET JSON com timeout (AbortController quando disponível + corrida de promessas). */
export async function fetchJson<T>(url: string, opts: { fetchImpl?: FetchLike; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<T> {
  const doFetch: FetchLike = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const timeoutMs = opts.timeoutMs ?? 6000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([doFetch(url, { headers: opts.headers, signal: controller?.signal }), timeout]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
