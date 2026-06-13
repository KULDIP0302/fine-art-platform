import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShippingForm, type ShippingFormData } from "./ShippingForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

interface PaymentCheckoutProps {
  artworkId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface RazorpayOrder {
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

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayPaymentSuccessResponse) => void;
  modal: { ondismiss: () => void };
  prefill: {
    name: string;
    contact: string;
  };
  theme: { color: string };
}

interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
});

const PaymentCheckout = ({ artworkId, onSuccess, onClose }: PaymentCheckoutProps) => {
  const [step, setStep] = useState<"address" | "payment">("address");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<RazorpayOrder | null>(null);
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(schema),
  });

  const handleAddressSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    setStep("payment");
  };

  const handlePayment = async () => {
    if (!shippingData) return;

    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Unable to load Razorpay checkout");
        return;
      }

      const data = (await api("/api/payments/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({
          items: [{ artworkId, quantity: 1 }],
          shippingAddress: shippingData,
        }),
      })) as RazorpayOrder;

      setOrderData(data);

      const options: RazorpayOptions = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId || "",
        name: "FineArt Platform",
        description: "Artwork Purchase",
        handler: async (response) => {
          await api("/api/payments/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({
              backendOrderId: data.backendOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          toast.success("✅ Payment verified successfully!");
          onSuccess?.();
        },
        modal: {
          ondismiss: () => toast.info("Payment cancelled"),
        },
        prefill: {
          name: shippingData.fullName,
          contact: shippingData.phone,
        },
        theme: { color: "#1e293b" },
      };

      const rzp = new window.Razorpay!(options);
      rzp.open();

    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Payment failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {step === "address" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>📍 Shipping Address</CardTitle>
              <CardDescription>Enter delivery details</CardDescription>
            </CardHeader>
            <CardContent>
              <ShippingForm onSubmit={handleAddressSubmit} />
            </CardContent>
          </Card>

          {onClose && (
            <Button variant="outline" className="w-full mt-4" onClick={onClose}>
              Cancel
            </Button>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>💳 Complete Payment</CardTitle>
            <CardDescription>Secure Razorpay checkout</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div>📦 {shippingData?.fullName}</div>
              <div className="text-xs">
                {shippingData?.city}, {shippingData?.state}
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full"
            >
              {loading
                ? "Processing..."
                : `🚀 Pay ₹${orderData?.grandTotalAmount?.toLocaleString() || "---"} Now`}
            </Button>

            <Button
              variant="outline"
              onClick={() => setStep("address")}
              className="w-full"
            >
              Edit Address
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentCheckout;