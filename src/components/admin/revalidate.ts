'use client';
/** Liek publiskajai lapai uzreiz parādīt izmaiņas. */
export function revalidateSite(slugs: string[] = []) {
  fetch('/api/admin/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slugs }) }).catch(() => {});
}
