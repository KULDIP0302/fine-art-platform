import { useState, useEffect, useMemo, useCallback } from "react";
import { Download } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { downloadOrderReceiptPdf, getPublicImageUrl } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Palette, MessageCircle, Bookmark, ShoppingBag, Plus, Edit2, Trash2, Eye, BarChart3, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChatDialog from "@/components/ChatDialog";
import ProfileHeader from "@/components/dashboard/ProfileHeader";
import OrdersTab from "@/components/dashboard/OrdersTab";
import SavedArtworksTab from "@/components/dashboard/SavedArtworksTab";
import FollowingTab from "@/components/dashboard/FollowingTab";
import ArtistApplicationTab from "@/components/dashboard/ArtistApplicationTab";
import { toast } from "sonner";

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

interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "failed";
  courierId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug?: string;
}

interface Artwork {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: Category | string;
  image: string;
  status: string;
  createdAt: string;
}

interface ArtistOrder {
  _id: string;
  buyer?: {
    _id: string;
    name: string;
    email: string;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  items: Array<{
    artwork: Artwork;
    quantity: number;
    price: number;
  }>;
  status: string;
  paymentStatus?: string;
  courierId?: string;
  trackingId?: string;
  shippingAddress?: {
    fullName?: string;
    name?: string;
    phone: string;
    addressLine1?: string;
    address?: string;
    city: string;
    state: string;
    pincode: string;
  };
  total?: number;
  totalAmount?: number;
  grandTotalAmount?: number;
  createdAt: string;
}

interface Report {
  _id: string;
  artwork: {
    _id: string;
    title: string;
    image: string;
  };
  reportedBy: {
    _id: string;
    name: string;
  };
  reason: string;
  status: string;
  createdAt: string;
}

interface Message {
  _id: string;
  sender: { _id: string; name: string; profilePic?: string };
  receiver: { _id: string; name: string; profilePic?: string };
  content: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  unreadCount: number;
}



const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<{
    id: string;
    name: string;
    avatar: string;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Artist-specific states
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artistOrders, setArtistOrders] = useState<ArtistOrder[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [showAddArtwork, setShowAddArtwork] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ArtistOrder | null>(null);
  const [shipTracking, setShipTracking] = useState("");
  const [shipCourier, setShipCourier] = useState("");
  const [shipCourierStatus, setShipCourierStatus] = useState("IN_TRANSIT");
  const [shipFiles, setShipFiles] = useState<FileList | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  const [myOrderSearch, setMyOrderSearch] = useState("");
  const [myOrderStatus, setMyOrderStatus] = useState("");
  const [myOrderPayment, setMyOrderPayment] = useState("");
  const [myOrderFrom, setMyOrderFrom] = useState("");
  const [myOrderTo, setMyOrderTo] = useState("");
  const [myOrderSort, setMyOrderSort] = useState<"date" | "status" | "amount">("date");

  const fetchOrders = useCallback(async (query = "") => {
    try {
      const data = await api<Order[]>(`/api/user/orders${query}`);
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  }, []);

  const fetchArtistCore = useCallback(async () => {
    if (!user || user.role !== "artist" || user.artistApplication?.status !== "approved") return;
    try {
      const [artworksRes, reportsRes] = await Promise.all([
        api<{ artworks: Artwork[] }>(`/api/artworks?artist=${user._id}&limit=100`).catch(() => ({ artworks: [] })),
        api<Report[]>("/api/user/artist/reports").catch(() => []),
      ]);
      setArtworks(Array.isArray(artworksRes?.artworks) ? artworksRes.artworks : []);
      setReports(Array.isArray(reportsRes) ? reportsRes : []);
      const categoriesRes = await api<Category[]>('/api/categories').catch(() => []);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
    } catch (error) {
      console.error("Failed to load artist data", error);
    }
  }, [user?._id, user?.role, user?.artistApplication?.status]);

  const fetchArtistOrders = useCallback(async () => {
    if (!user || user.role !== "artist" || user.artistApplication?.status !== "approved") return;
    try {
      const params = new URLSearchParams();
      if (myOrderStatus) params.set("status", myOrderStatus);
      if (myOrderPayment) params.set("paymentStatus", myOrderPayment);
      if (myOrderFrom) params.set("from", myOrderFrom);
      if (myOrderTo) params.set("to", myOrderTo);
      const qs = params.toString() ? `?${params}` : "";
      const data = await api<ArtistOrder[]>(`/api/user/artist/orders${qs}`);
      setArtistOrders(Array.isArray(data) ? data : []);
    } catch {
      setArtistOrders([]);
    }
  }, [user?._id, user?.role, user?.artistApplication?.status, myOrderStatus, myOrderPayment, myOrderFrom, myOrderTo]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Conversation[]>('/api/user/messages');
      const normalized = Array.isArray(data)
        ? data.map((conv) => ({
            ...conv,
            participantAvatar: getPublicImageUrl(conv.participantAvatar),
          }))
        : [];
      setConversations(normalized);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchOrders();
    fetchConversations();
    if (user.role === "artist" && user.artistApplication?.status === "approved") {
      fetchArtistCore();
    }
  }, [isAuthenticated, user, fetchOrders, fetchConversations, fetchArtistCore]);

  useEffect(() => {
    if (!user || user.role !== "artist" || user.artistApplication?.status !== "approved") return;
    fetchArtistOrders();
  }, [user, fetchArtistOrders]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  const openChat = (artistId: string, artistName: string, artistAvatar: string) => {
    setSelectedArtist({ id: artistId, name: artistName, avatar: artistAvatar });
    setChatOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview("");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const updatedOrder = await api<Order>(`/api/user/orders/${orderId}/cancel`, { method: 'PUT' });
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: (updatedOrder as any)?.status || 'cancelled' } : o
        )
      );
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  // Artist functions
  const handleAddArtwork = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !price || !category || (!image && !imageFile)) {
      toast.error("Title, price, category and image are required");
      return;
    }

    try {
      let artworkImage = image;

      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploaded = await api<{ imageUrl: string }>('/api/artworks/upload', {
          method: 'POST',
          body: fd,
        });

        if (uploaded?.imageUrl) {
          artworkImage = uploaded.imageUrl;
        }
      }

      if (!artworkImage) {
        toast.error('Artwork image is required');
        return;
      }

      const payload = {
        title,
        description,
        price: parseFloat(price),
        category,
        image: artworkImage,
      };

      const artwork = editingArtwork
        ? await api<Artwork>(`/api/artworks/${editingArtwork._id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await api<Artwork>('/api/artworks', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (editingArtwork) {
        setArtworks(artworks.map((a) => (a._id === artwork._id ? artwork : a)));
        toast.success('Artwork updated!');
      } else {
        setArtworks([...artworks, artwork]);
        toast.success('Artwork added!');
      }

      resetForm();
      setShowAddArtwork(false);
    } catch (err) {
      toast.error('Failed to save artwork');
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
      toast.success("Order marked as shipped");
      setSelectedOrder(null);
      setShipTracking("");
      setShipCourier("");
      setShipFiles(null);
      fetchArtistCore();
      fetchArtistOrders();
    } catch {
      toast.error("Failed to ship order — check payment status and proof images");
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
    setImageFile(null);
    setImagePreview("");
    setEditingArtwork(null);
  };



  const orderTotal = (o: ArtistOrder) =>
    o.grandTotalAmount ?? o.totalAmount ?? o.total ?? 0;

  const filteredArtistOrders = useMemo(() => {
    const q = myOrderSearch.trim().toLowerCase();
    let list = artistOrders.filter((order) => {
      if (myOrderStatus && order.status !== myOrderStatus) return false;
      if (myOrderPayment && (order.paymentStatus || "") !== myOrderPayment) return false;
      if (q) {
        const buyer = `${(order.buyer || order.user)?.name || ""} ${(order.buyer || order.user)?.email || ""}`.toLowerCase();
        const titles = (order.items || [])
          .map((i) => i.artwork?.title || "")
          .join(" ")
          .toLowerCase();
        if (!buyer.includes(q) && !titles.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (myOrderSort) {
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "amount":
          return orderTotal(b) - orderTotal(a);
        default:
          return 0;
      }
    });
    return list;
  }, [artistOrders, myOrderSearch, myOrderStatus, myOrderPayment, myOrderSort]);

  const totalRevenue = artistOrders
    .filter((o) =>
      ["delivered", "shipped", "paid", "confirmed"].includes(o.status)
    )
    .reduce((sum, o) => sum + orderTotal(o), 0);
  const pendingOrders = artistOrders.filter((o) =>
    ["pending_payment", "pending", "paid"].includes(o.status)
  ).length;

  const isApprovedArtist = !!user && user.role === "artist" && user.artistApplication?.status === "approved";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ProfileHeader />

      <Tabs defaultValue="orders" className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          {/* REGULAR USER TABS */}
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Saved
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="following" className="gap-2">
            <Users className="h-4 w-4" />
            Following
            <span className="ml-1 text-xs text-muted-foreground">({(user.following ?? []).length})</span>
          </TabsTrigger>
          <TabsTrigger value="artist" className="gap-2">
            <Palette className="h-4 w-4" />
            Artist Apply
          </TabsTrigger>

          {/* ARTIST-ONLY TABS (after approval) */}
          {isApprovedArtist && (
            <>
              <TabsTrigger value="my-artworks" className="gap-2">
                <Eye className="h-4 w-4" />
                My Artworks
              </TabsTrigger>
              <TabsTrigger value="my-orders" className="gap-2">
                <Package className="h-4 w-4" />
                My Orders
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* REGULAR USER TABS CONTENT */}
        <TabsContent value="orders">
          <OrdersTab orders={orders} onCancelOrder={handleCancelOrder} refreshOrders={fetchOrders} />
        </TabsContent>

        <TabsContent value="saved">
          <SavedArtworksTab />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {loading ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openChat(conv.participantId, conv.participantName, conv.participantAvatar)}
                className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-secondary/30"
              >
                <div className="relative">
                  <img src={conv.participantAvatar} alt={conv.participantName} className="h-12 w-12 rounded-full object-cover" />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{conv.participantName}</h3>
                    <span className="text-xs text-muted-foreground">{conv.lastMessage}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{conv.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="following">
          <FollowingTab onOpenChat={openChat} />
        </TabsContent>

        <TabsContent value="artist">
          <ArtistApplicationTab />
        </TabsContent>

        {/* ARTIST TABS CONTENT */}
        {isApprovedArtist && (
          <>
            {/* MY ARTWORKS TAB */}
            <TabsContent value="my-artworks" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Artworks</h2>
                <Button onClick={() => setShowAddArtwork(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Artwork
                </Button>
              </div>

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
                          {categories.length > 0 ? (
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full rounded-md border px-3 py-2"
                            >
                              <option value="">Select category</option>
                              {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              placeholder="Paintings, Sculpture, etc"
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Artwork Image *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="w-full rounded-md border px-3 py-2"
                          />
                        </div>
                      </div>

                      {imagePreview ? (
                        <div className="mt-4">
                          <label className="text-sm font-medium">Preview</label>
                          <img src={imagePreview} alt="Artwork preview" className="mt-2 h-40 w-full rounded-lg object-cover" />
                        </div>
                      ) : null}


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
                          {art.description || "No description"}
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
                              const categoryId = typeof art.category === 'string' ? art.category : (art.category?._id || '');
                              setCategory(categoryId);
                              setImage(art.image);
                              setImageFile(null);
                              setImagePreview(art.image);
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

            {/* MY ORDERS TAB (Income) */}
            <TabsContent value="my-orders" className="space-y-4">
              <h2 className="text-xl font-bold">Orders on Your Artworks</h2>

              <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Search buyer or artwork title..."
                  value={myOrderSearch}
                  onChange={(e) => setMyOrderSearch(e.target.value)}
                  className="min-w-[200px] max-w-md"
                />
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={myOrderStatus}
                  onChange={(e) => setMyOrderStatus(e.target.value)}
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
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={myOrderPayment}
                  onChange={(e) => setMyOrderPayment(e.target.value)}
                >
                  <option value="">All payments</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={myOrderSort}
                  onChange={(e) => setMyOrderSort(e.target.value as "date" | "status" | "amount")}
                >
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                  <option value="amount">Amount</option>
                </select>
                <Input
                  type="date"
                  className="w-auto min-w-[130px] h-9"
                  value={myOrderFrom}
                  onChange={(e) => setMyOrderFrom(e.target.value)}
                  title="From"
                />
                <Input
                  type="date"
                  className="w-auto min-w-[130px] h-9"
                  value={myOrderTo}
                  onChange={(e) => setMyOrderTo(e.target.value)}
                  title="To"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    fetchArtistCore();
                    fetchArtistOrders();
                  }}
                >
                  Refresh
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredArtistOrders.length} of {artistOrders.length}
                </span>
              </div>

              <div className="space-y-4">
                {artistOrders.length === 0 ? (
                  <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                ) : filteredArtistOrders.length === 0 ? (
                  <div className="rounded-lg border bg-card p-8 text-center">
                    <p className="text-muted-foreground">No orders match your filters</p>
                  </div>
                ) : filteredArtistOrders.map((order) => (
                    <Card key={order._id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">
                                {(order.buyer || order.user)?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {(order.buyer || order.user)?.email}
                              </p>
                            </div>
                            <Badge>{order.status}</Badge>
                          </div>
                          {order.paymentStatus === "paid" ? (
                            <Button
                              size="sm"
                              className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 w-full"
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
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Receipt is available after the buyer completes payment.
                            </p>
                          )}
                          {order.shippingAddress && (
                            <div className="rounded-lg bg-secondary/20 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">📍 Shipping Address</p>
                              <p className="text-sm">
                                {order.shippingAddress.fullName || order.shippingAddress.name}
                              </p>
                              <p className="text-xs">
                                {order.shippingAddress.addressLine1 || order.shippingAddress.address},{" "}
                                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                                {order.shippingAddress.pincode}
                              </p>
                              <p className="text-xs">{order.shippingAddress.phone}</p>
                            </div>
                          )}

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
                            order.paymentStatus === "paid" && (
                              <Button
                                variant="default"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShipTracking(order.trackingId || order.courierId || "");
                                  setShipCourier("");
                                  setShipFiles(null);
                                }}
                                className="w-full"
                              >
                                Ship order (tracking + proof)
                              </Button>
                            )}

                          <p className="text-xs text-muted-foreground">
                            Ordered: {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            </TabsContent>

            {/* ANALYTICS TAB */}
            <TabsContent value="analytics" className="space-y-4">
              <h2 className="text-xl font-bold">Analytics</h2>
              <div className="grid gap-4 sm:grid-cols-4">
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
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{artistOrders.filter(o => o.status === "delivered" || o.status === "confirmed" || o.status === "shipped").length > 0 
                        ? Math.round(totalRevenue / artistOrders.filter(o => o.status === "delivered" || o.status === "confirmed" || o.status === "shipped").length) 
                        : 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* REPORTS TAB */}
            <TabsContent value="reports" className="space-y-4">
              <h2 className="text-xl font-bold">Reports on Your Artworks</h2>

              {reports.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No reports on your artworks</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report._id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                              <img
                                src={report.artwork.image}
                                alt={report.artwork.title}
                                className="h-20 w-20 rounded object-cover"
                              />
                              <div>
                                <p className="font-bold">{report.artwork.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Reported by: {report.reportedBy.name}
                                </p>
                                <p className="mt-2 text-sm">{report.reason}</p>
                              </div>
                            </div>
                            <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* COURIER ID MODAL */}
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
              <div>
                <p className="text-sm font-medium mb-2">
                  Buyer: {(selectedOrder.buyer || selectedOrder.user)?.name}
                </p>
              </div>
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
                  placeholder="e.g. BlueDart, Delhivery"
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
                <label className="text-sm font-medium">Shipment proof images *</label>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedArtist && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          artistId={selectedArtist.id}
          artistName={selectedArtist.name}
          artistAvatar={selectedArtist.avatar}
        />
      )}
    </div>
  );
};

export default Dashboard;


