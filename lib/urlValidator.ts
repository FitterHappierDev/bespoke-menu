export async function validateUrl(url: string, timeoutMs = 4000): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    return res.ok || res.status === 405
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

export async function validateUrls(urls: string[]): Promise<Record<string, boolean>> {
  const entries = await Promise.all(urls.map(async (u) => [u, await validateUrl(u)] as const))
  return Object.fromEntries(entries)
}
