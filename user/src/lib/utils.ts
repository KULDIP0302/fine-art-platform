import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPublicImageUrl(src?: string, cacheBust?: number | string) {
  if (!src) return 'https://via.placeholder.com/150';
  if (src.startsWith('http')) return src;

  const base = import.meta.env.DEV
    ? 'https://fine-art-platform.onrender.com'
    : import.meta.env.VITE_API_URL || 'https://fine-art-platform.onrender.com';

  // Normalize path; backend static files are served under /uploads/
  let cleaned = src.replace(/\\/g, '/').replace(/^\/+/, '');
  while (cleaned.startsWith('uploads/uploads/')) {
    cleaned = cleaned.slice('uploads/'.length);
  }
  // Legacy: profile pic stored as bare filename only
  if (!cleaned.includes('/')) {
    cleaned = `uploads/${cleaned}`;
  }
  const url = `${base}/${cleaned}`;
  if (cacheBust != null && String(cacheBust).length) {
    return `${url}?t=${encodeURIComponent(String(cacheBust))}`;
  }
  return url;
}

/** Buyer or seller: GET /api/user/orders/:id/receipt (requires payment completed). */
export async function downloadOrderReceiptPdf(orderId: string): Promise<void> {
  const token = localStorage.getItem("userToken");
  const res = await fetch(`/api/user/orders/${orderId}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = "Failed to download receipt";
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/pdf")) {
    throw new Error("Server did not return a PDF");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${orderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
