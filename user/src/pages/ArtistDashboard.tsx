import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Eye, Package, BarChart3, Settings, X } from "lucide-react";
import { toast } from "sonner";

interface Artwork {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image: string;
  status: string;
  createdAt: string;
}

interface Order {
  _id: string;
  buyer?: { _id: string; name: string; email: string };
  user?: { _id: string; name: string; email: string };
  paymentStatus?: string;
  items: Array<{
    artwork: Artwork;
    quantity: number;
    price: number;
  }>;
  status: string;
  courier?: string;
  courierId?: string;
  total?: number;
  totalAmount?: number;
  grandTotalAmount?: number;
  createdAt: string;
}

const ArtistDashboard = () => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddArtwork, setShowAddArtwork] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shipTracking, setShipTracking] = useState("");
  const [shipCourier, setShipCourier] = useState("");
  const [shipCourierStatus, setShipCourierStatus] = useState("IN_TRANSIT");
  const [shipFiles, setShipFiles] = useState<FileList | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  const [lastReleasedCount, setLastReleasedCount] = useState(0);

  if (!isAuthenticated || user?.role !== "artist") {
    navigate("/");
    return null;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [artworksRes, ordersRes] = await Promise.all([
        api<{ artworks: Artwork[] }>("/api/artworks?artist=true&limit=100"),
        api<Order[]>("/api/user/artist/orders"),
      ]);
      setArtworks(Array.isArray(artworksRes?.artworks) ? artworksRes.artworks : []);
      setOrders(ordersRes);

      const releasedCount = ordersRes.filter((o) => o.payoutReleased).length;
      if (releasedCount > lastReleasedCount) {
        const diff = releasedCount - lastReleasedCount;
        toast.success(`Congrats! ${diff} payout${diff > 1 ? 's' : ''} released.`);
      }
      setLastReleasedCount(releasedCount);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtwork = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !price || !category || !image) {
      toast.error("All fields are required");
      return;
    }

    try {
      const artwork = editingArtwork
        ? await api<Artwork>(`/api/artworks/${editingArtwork._id}`, {
            method: "PUT",
            body: JSON.stringify({ title, description, price: parseFloat(price), category, image }),
          })
        : await api<Artwork>("/api/artworks", {
            method: "POST",
            body: JSON.stringify({ title, description, price: parseFloat(price), category, image }),
          });

      if (editingArtwork) {
        setArtworks(artworks.map((a) => (a._id === artwork._id ? artwork : a)));
        toast.success("Artwork updated!");
      } else {
        setArtworks([...artworks, artwork]);
        toast.success("Artwork added!");
      }

      resetForm();
      setShowAddArtwork(false);
    } catch (err) {
      toast.error("Failed to save artwork");
    }
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!confirm("Delete this artwork?")) return;

    try {
      await api(`/api/artworks/${artworkId}`, { method: "DELETE" });
      setArtworks(artworks.filter((a) => a._id !== artworkId));
      toast.success("Artwork deleted");
    } catch (err) {
      toast.error("Failed to delete artwork");
    }
  };

  const orderTotal = (o: Order) => o.grandTotalAmount ?? o.totalAmount ?? o.total ?? 0;

  const handleShipOrder = async (orderId: string) => {
    if (!shipTracking.trim() || !shipCourier.trim()) {
      toast.error("Tracking ID and courier name are required");
      return;
    }
    if (!shipFiles?.length) {
      toast.error("Upload at least one shipment proof image");
      return;
    }
    setShipLoading(true);
    try {
      const fd = new FormData();
      fd.append("trackingId", shipTracking.trim());
      fd.append("courier", shipCourier.trim());
      fd.append("courierTrackingStatus", shipCourierStatus || "IN_TRANSIT");
      Array.from(shipFiles).forEach((f) => fd.append("proofImages", f));
      await api(`/api/user/artist/orders/${orderId}/ship`, {
        method: "PUT",
        body: fd,
      });
      setSelectedOrder(null);
      setShipTracking("");
      setShipCourier("");
      setShipFiles(null);
      toast.success("Order marked as shipped");
      fetchData();
    } catch {
      toast.error("Failed to ship — order must be paid first");
    } finally {
      setShipLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImage("");
    setEditingArtwork(null);
  };

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const pendingOrders = orders.filter((o) =>
    ["paid", "pending_payment", "pending"].includes(o.status)
  ).length;

  const releasedPayouts = orders.filter((o) => o.payoutReleased).length;
  const awaitingPayouts = orders.filter(
    (o) => o.status === "delivered" && o.paymentStatus === "paid" && !o.payoutReleased
  ).length;

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">Artist Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your artworks and orders</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Artworks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{artworks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payouts Released</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{releasedPayouts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Awaiting Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{awaitingPayouts}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="artworks" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="artworks" className="gap-2">
            <Eye className="h-4 w-4" />
            My Artworks
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ARTWORKS TAB */}
        <TabsContent value="artworks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Your Artworks</h2>
            <Button onClick={() => setShowAddArtwork(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Artwork
            </Button>
          </div>

          {/* ADD/EDIT FORM */}
          {showAddArtwork && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <form onSubmit={handleAddArtwork} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Artwork title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description *</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your artwork..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price (₹) *</label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category *</label>
                      <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Paintings, Sculpture, etc"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Image URL *</label>
                      <Input
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingArtwork ? "Update" : "Add"} Artwork
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setShowAddArtwork(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ARTWORKS LIST */}
          {artworks.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No artworks yet. Add your first artwork!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((art) => (
                <Card key={art._id} className="overflow-hidden">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="h-40 w-full object-cover"
                  />
                  <CardContent className="pt-4">
                    <h3 className="font-bold">{art.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {art.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold">₹{art.price}</span>
                      <Badge variant={art.status === "active" ? "default" : "secondary"}>
                        {art.status}
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingArtwork(art);
                          setTitle(art.title);
                          setDescription(art.description);
                          setPrice(art.price.toString());
                          setCategory(art.category);
                          setImage(art.image);
                          setShowAddArtwork(true);
                        }}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteArtwork(art._id)}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-xl font-bold">Your Orders</h2>

          {orders.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order._id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{(order.buyer || order.user)?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(order.buyer || order.user)?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{order.status}</Badge>
                          {order.payoutReleased ? (
                            <Badge variant="success">Payout released</Badge>
                          ) : order.status === "delivered" && order.paymentStatus === "paid" ? (
                            <Badge variant="warning">Pending payout</Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between py-2">
                            <span>{item.artwork.title}</span>
                            <span className="font-medium">₹{item.price}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span>₹{orderTotal(order)}</span>
                        </div>
                      </div>

                      {(order.status === "paid" || order.status === "confirmed") &&
                      order.paymentStatus === "paid" ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShipTracking(order.courierId || "");
                              setShipCourier(order.courier || "");
                              setShipFiles(null);
                            }}
                            className="flex-1"
                          >
                            Ship order
                          </Button>
                        </div>
                      ) : order.status === "shipped" ? (
                        <div className="rounded-lg bg-secondary/30 p-3">
                          <p className="text-sm text-muted-foreground">
                            Courier: {order.courier || "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tracking: {order.courierId || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Delivery is confirmed by the buyer or auto after 7 days.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-secondary/30 p-3 text-sm text-muted-foreground">
                          {order.status}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Ordered: {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-xl font-bold">Analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {orders.filter((o) => o.status === "delivered").length} delivered orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ₹
                  {orders.filter((o) => o.status === "delivered").length > 0
                    ? Math.round(
                        totalRevenue / orders.filter((o) => o.status === "delivered").length
                      )
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Per completed order</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-xl font-bold">Account Settings</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-foreground">{user?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-foreground">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Badge className="mt-1">Artist</Badge>
              </div>
              <Button onClick={() => navigate("/change-password")}>
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Ship order</CardTitle>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium">
                Buyer: {(selectedOrder.buyer || selectedOrder.user)?.name}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tracking ID *</label>
                <Input
                  value={shipTracking}
                  onChange={(e) => setShipTracking(e.target.value)}
                  placeholder="Carrier tracking number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Courier name *</label>
                <Input
                  value={shipCourier}
                  onChange={(e) => setShipCourier(e.target.value)}
                  placeholder="e.g. BlueDart"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Carrier tracking status</label>
                <Input
                  value={shipCourierStatus}
                  onChange={(e) => setShipCourierStatus(e.target.value)}
                  placeholder="IN_TRANSIT or DELIVERED"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Proof images *</label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setShipFiles(e.target.files)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={shipLoading}
                  onClick={() => handleShipOrder(selectedOrder._id)}
                  className="flex-1"
                >
                  {shipLoading ? "Submitting..." : "Mark shipped"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ArtistDashboard;
