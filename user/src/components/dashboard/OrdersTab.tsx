import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Truck, XCircle, Package, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { downloadOrderReceiptPdf, getPublicImageUrl } from "@/lib/utils";
import { loadRazorpayScript, type RazorpayCheckoutOrderResponse } from "@/lib/razorpay";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "dispute"
  | "under_review"
  | "refunded"
  | "partial_refund"
  | "cancelled";

interface OrderItem {
  artwork: {
    _id: string;
    title: string;
    image: string;
    artist: {
      _id: string;
      name: string;
    };
  };
  quantity: number;
  price: number;
}

interface BackendOrder {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid" | "failed";
  courierId?: string;
  trackingId?: string;
  autoDeliverAt?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  pending_payment: <Clock className="h-4 w-4 text-yellow-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  paid: <Clock className="h-4 w-4 text-blue-500" />,
  confirmed: <Clock className="h-4 w-4 text-blue-500" />,
  shipped: <Truck className="h-4 w-4 text-primary" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-600" />,
  dispute: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  under_review: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  refunded: <XCircle className="h-4 w-4 text-destructive" />,
  partial_refund: <XCircle className="h-4 w-4 text-orange-600" />,
  cancelled: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusLabel: Record<string, string> = {
  pending_payment: "Awaiting payment",
  pending: "Awaiting payment",
  paid: "Paid — awaiting shipment",
  confirmed: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  dispute: "Dispute",
  under_review: "Under review",
  refunded: "Refunded",
  partial_refund: "Partial refund",
  cancelled: "Cancelled",
};

interface OrdersTabProps {
  orders: BackendOrder[];
  onCancelOrder: (orderId: string) => void;
  refreshOrders?: (query?: string) => void;
}

const OrdersTab = ({ orders, onCancelOrder, refreshOrders }: OrdersTabProps) => {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status" | "amount">("date");

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<FileList | null>(null);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const copyTrackingId = (trackingId: string) => {
    navigator.clipboard.writeText(trackingId);
    toast.success("Tracking ID copied!");
  };

  const handleRefresh = () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPaymentStatus) params.set("paymentStatus", filterPaymentStatus);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const qs = params.toString() ? `?${params}` : "";
    refreshOrders?.(qs);
    toast.success("Orders refreshed");
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPaymentStatus) params.set("paymentStatus", filterPaymentStatus);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const qs = params.toString() ? `?${params}` : "";
    refreshOrders?.(qs);
  }, [filterStatus, filterPaymentStatus, filterFrom, filterTo, refreshOrders]);

  const handlePayNow = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        toast.error("Unable to load Razorpay checkout");
        return;
      }
      const data = await api<RazorpayCheckoutOrderResponse>(
        `/api/payments/razorpay/pay-order/${orderId}`,
        { method: "POST" },
      );
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId || "",
        name: "FineArt Platform",
        description: "Complete your order",
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          await api("/api/payments/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({
              backendOrderId: data.backendOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          toast.success("Payment successful — you can download your receipt below.");
          const params = new URLSearchParams();
          if (filterStatus) params.set("status", filterStatus);
          if (filterPaymentStatus) params.set("paymentStatus", filterPaymentStatus);
          if (filterFrom) params.set("from", filterFrom);
          if (filterTo) params.set("to", filterTo);
          const qs = params.toString() ? `?${params}` : "";
          refreshOrders?.(qs);
        },
        modal: {
          ondismiss: () => toast.info("Payment cancelled"),
        },
        theme: { color: "#1e293b" },
      };
      const Rp = window.Razorpay;
      if (!Rp) {
        toast.error("Razorpay failed to load");
        return;
      }
      const rzp = new Rp(options);
      rzp.open();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Payment could not start");
    } finally {
      setPayingOrderId(null);
    }
  };

  const confirmDelivery = async (orderId: string) => {
    try {
      await api(`/api/orders/confirm-delivery/${orderId}`, { method: "PUT" });
      toast.success("Delivery confirmed");
      refreshOrders?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not confirm delivery");
    }
  };

  const submitDispute = async () => {
    if (!disputeOrderId || !disputeReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (!disputeFiles?.length) {
      toast.error("At least one proof image is required");
      return;
    }
    setDisputeLoading(true);
    try {
      const fd = new FormData();
      fd.append("orderId", disputeOrderId);
      fd.append("reason", disputeReason.trim());
      fd.append("description", disputeDesc.trim());
      Array.from(disputeFiles).forEach((f) => fd.append("images", f));
      await api("/api/disputes", { method: "POST", body: fd });
      toast.success("Issue reported. Admin will review.");
      setDisputeOpen(false);
      setDisputeOrderId(null);
      setDisputeReason("");
      setDisputeDesc("");
      setDisputeFiles(null);
      refreshOrders?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setDisputeLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        const matchesStatus = !filterStatus || order.status === filterStatus;
        const matchesPaymentStatus =
          !filterPaymentStatus || order.paymentStatus === filterPaymentStatus;
        const items = order.items ?? [];
        const matchesSearch =
          !searchTerm ||
          items.some((item) => {
            const title = (item.artwork as { title?: string } | undefined)?.title ?? "";
            const artistName =
              typeof item.artwork === "object" && item.artwork && "artist" in item.artwork
                ? ((item.artwork as { artist?: { name?: string } }).artist?.name ?? "")
                : "";
            const q = searchTerm.toLowerCase();
            return title.toLowerCase().includes(q) || artistName.toLowerCase().includes(q);
          });
        return matchesStatus && matchesPaymentStatus && matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "status":
            return a.status.localeCompare(b.status);
          case "amount":
            return b.totalAmount - a.totalAmount;
          default:
            return 0;
        }
      });
  }, [orders, filterStatus, filterPaymentStatus, searchTerm, sortBy]);

  const openDispute = (orderId: string) => {
    setDisputeOrderId(orderId);
    setDisputeOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <Input
          placeholder="Search artwork title/artist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="min-w-[220px]"
        />

        <select
          className="rounded-md border bg-background px-2 py-1"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All status</option>
          <option value="pending_payment">Awaiting payment</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="dispute">Dispute</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          className="rounded-md border bg-background px-2 py-1"
          value={filterPaymentStatus}
          onChange={(e) => setFilterPaymentStatus(e.target.value)}
        >
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>

        <Input
          type="date"
          className="w-auto min-w-[140px]"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          title="From date"
        />
        <Input
          type="date"
          className="w-auto min-w-[140px]"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          title="To date"
        />

        <select
          className="rounded-md border bg-background px-2 py-1"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "status" | "amount")}
        >
          <option value="date">Date</option>
          <option value="status">Status</option>
          <option value="amount">Amount</option>
        </select>

        <Button type="button" onClick={handleRefresh}>
          Refresh
        </Button>

        <div className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders?.length || 0} orders
        </div>
      </div>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise an issue</DialogTitle>
            <DialogDescription>
              Describe the problem and upload clear proof images. This pauses payout until admin review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason</Label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Short summary"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={disputeDesc}
                onChange={(e) => setDisputeDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Proof images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setDisputeFiles(e.target.files)}
              />
            </div>
            <Button type="button" disabled={disputeLoading} onClick={submitDispute}>
              {disputeLoading ? "Submitting..." : "Submit issue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredOrders.length === 0 ? (
        <div className="text-center p-8">
          <Package className="mx-auto h-10 w-10" />
          <p>No orders found</p>
        </div>
      ) : (
        filteredOrders.map((order) => (
          <div key={order._id} className="border p-4 rounded-lg">
            {(order.items ?? []).map((item, idx) => {
              const aw = item.artwork as
                | { title?: string; image?: string; artist?: { name?: string } }
                | undefined;
              return (
              <div key={idx} className="flex gap-4">
                <img
                  src={getPublicImageUrl(aw?.image)}
                  alt=""
                  className="h-20 w-20 object-cover rounded"
                />

                <div className="flex-1">
                  <h3 className="font-medium">{aw?.title ?? "Artwork"}</h3>
                  <p className="text-sm text-muted-foreground">by {aw?.artist?.name ?? "—"}</p>

                  {idx === 0 && (
                    <>
                      <div className="flex gap-2 mt-1 items-center flex-wrap">
                        {statusIcon[order.status] ?? <Package className="h-4 w-4" />}
                        <Badge>{statusLabel[order.status] ?? order.status}</Badge>
                      </div>

                      <p className="mt-1">Total: ₹{order.totalAmount}</p>

                      {(order.courierId || order.trackingId) && (
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-sm font-mono">
                            {order.courierId || order.trackingId}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyTrackingId(order.courierId || order.trackingId || "")
                            }
                          >
                            Copy
                          </Button>
                        </div>
                      )}

                      {order.autoDeliverAt && order.status === "shipped" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-delivery on no action:{" "}
                          {new Date(order.autoDeliverAt).toLocaleString()}
                        </p>
                      )}

                      {(order.status === "pending_payment" || order.status === "pending") &&
                        order.paymentStatus === "unpaid" && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className="gap-2 bg-primary"
                              disabled={payingOrderId === order._id}
                              onClick={() => handlePayNow(order._id)}
                            >
                              <CreditCard className="h-4 w-4" />
                              {payingOrderId === order._id ? "Opening…" : "Pay now"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => onCancelOrder(order._id)}
                            >
                              Cancel order
                            </Button>
                          </div>
                        )}

                      {order.status === "shipped" && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => confirmDelivery(order._id)}
                          >
                            Confirm delivery
                          </Button>
                          <Button type="button" variant="outline" onClick={() => openDispute(order._id)}>
                            Raise issue
                          </Button>
                        </div>
                      )}

                      <Badge
                        className="mt-2"
                        variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                      >
                        Payment: {order.paymentStatus}
                      </Badge>
                      {order.paymentStatus === "paid" && (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                          onClick={async () => {
                            try {
                              await downloadOrderReceiptPdf(order._id);
                              toast.success("Receipt downloaded");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed to download receipt");
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          Download receipt
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        ))
      )}
    </div>
  );
};

export default OrdersTab;
