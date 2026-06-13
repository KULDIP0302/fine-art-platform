/** Load Razorpay checkout script once. */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
  );

  if (existing) {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOrderResponse {
  backendOrderId: string;
  razorpayOrderId?: string;
  amount: number;
  currency: string;
  key_id: string;
  platformFeePercent: number;
  subtotalAmount: number;
  platformFeeAmount: number;
  grandTotalAmount: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
