import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  supabase,
  type Address,
  type DeliverySlot,
} from "@/integrations/supabase/client";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/integrations/razorpay/payments.functions";
import { useCart } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (data: unknown) => void) => void;
    };
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [deliveryCharge, setDeliveryCharge] = useState(20);
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(500);
  const [submitting, setSubmitting] = useState(false);

  // new address form
  const [newAddr, setNewAddr] = useState({
    label: "Home",
    full_address: "",
    city: "",
    pincode: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: settings } = await supabase.from("app_settings").select("*");
      if (settings) {
        const dc = settings.find((s) => s.key === "delivery_charge");
        const fd = settings.find((s) => s.key === "free_delivery_above");
        if (dc) setDeliveryCharge(Number(dc.value));
        if (fd) setFreeDeliveryAbove(Number(fd.value));
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data: slotData } = await supabase
        .from("delivery_slots")
        .select("*")
        .eq("is_active", true)
        .gte("slot_date", today)
        .order("slot_date")
        .limit(20);
      setSlots((slotData as DeliverySlot[] | null) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      const list = (data as Address[] | null) ?? [];
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) setAddressId(def.id);
    })();
  }, [user]);

  const sub = subtotal();
  const dc = sub >= freeDeliveryAbove ? 0 : deliveryCharge;
  const total = sub + dc;

  const saveNewAddress = async () => {
    if (!user) return;
    if (!/^\d{6}$/.test(newAddr.pincode)) {
      toast.error("Pincode must be 6 digits");
      return;
    }
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...newAddr, user_id: user.id, is_default: addresses.length === 0 })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const created = data as Address;
    setAddresses((prev) => [created, ...prev]);
    setAddressId(created.id);
    setShowAddForm(false);
    setNewAddr({ label: "Home", full_address: "", city: "", pincode: "" });
    toast.success("Address saved");
  };

  const startRazorpayCheckout = async (orderId: string) => {
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      toast.error("Could not load payment SDK. Check your connection.");
      return false;
    }
    let rzpData: Awaited<ReturnType<typeof createRazorpayOrder>>;
    try {
      rzpData = await createRazorpayOrder({ data: { orderId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start payment";
      toast.error(msg);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const rzp = new window.Razorpay!({
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        order_id: rzpData.razorpayOrderId,
        name: "SPK Farm Fresh",
        description: `Order #${orderId.slice(0, 8)}`,
        prefill: {
          name: user?.user_metadata?.full_name ?? "",
          email: user?.email ?? "",
          contact: user?.phone ?? "",
        },
        theme: { color: "#16a34a" },
        handler: async (resp: unknown) => {
          const r = resp as {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          };
          try {
            await verifyRazorpayPayment({
              data: {
                orderId,
                razorpay_order_id: r.razorpay_order_id,
                razorpay_payment_id: r.razorpay_payment_id,
                razorpay_signature: r.razorpay_signature,
              },
            });
            resolve(true);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Payment verification failed";
            toast.error(msg);
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.error("Payment cancelled. Your order is awaiting payment.");
            resolve(false);
          },
        },
      });
      rzp.open();
    });
  };

  const placeOrder = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (items.length === 0) return;
    if (!addressId) {
      toast.error("Please add a delivery address");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          address_id: addressId,
          delivery_slot_id: slotId || null,
          status: "pending",
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: "pending",
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        quantity: i.quantity,
        price_at_time: i.price,
        unit: i.unit,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      if (paymentMethod === "online") {
        const paid = await startRazorpayCheckout(order.id);
        if (!paid) {
          // Order is saved as pending — user can retry from Orders page.
          navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
          return;
        }
      }

      clear();
      navigate({ to: "/order-success/$orderId", params: { orderId: order.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Order failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-32">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => window.history.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <h1 className="flex-1 text-center font-display text-lg font-bold text-primary">Cart</h1>
        <div className="w-9" />
      </header>

      <div className="px-4 py-3">
        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl">🛒</div>
            <p className="mt-3 font-display font-bold text-primary">Your cart is empty</p>
            <Link
              to="/shop"
              className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2 rounded-2xl bg-card p-2">
              <AnimatePresence>
                {items.map((i) => (
                  <motion.li
                    key={i.productId}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="flex items-center gap-3 rounded-xl bg-background p-3"
                  >
                    <span className="text-2xl">{i.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-primary">{i.name}</p>
                      <p className="text-xs text-muted-foreground">₹{i.price} {i.unit}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5">
                      <button
                        onClick={() => setQuantity(i.productId, i.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-primary"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-primary">
                        {i.quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(i.productId, i.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-primary"
                        aria-label="Increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-14 text-right font-display font-bold text-primary">
                      ₹{(i.price * i.quantity).toFixed(0)}
                    </p>
                    <button
                      onClick={() => remove(i.productId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* Address */}
            <section className="mt-4 rounded-2xl bg-card p-4">
              <h2 className="mb-2 font-display font-bold text-primary">Delivery Address</h2>
              {!user ? (
                <Link to="/login" className="text-sm font-semibold text-accent">
                  Sign in to add address →
                </Link>
              ) : addresses.length === 0 && !showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-sm font-semibold text-accent"
                >
                  + Add address
                </button>
              ) : (
                <>
                  <RadioGroup value={addressId} onValueChange={setAddressId}>
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-background"
                      >
                        <RadioGroupItem value={a.id} className="mt-1" />
                        <div className="text-sm">
                          <p className="font-semibold text-primary">{a.label}</p>
                          <p className="text-muted-foreground">
                            {a.full_address}, {a.city} - {a.pincode}
                          </p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-2 text-sm font-semibold text-accent"
                    >
                      + Add new address
                    </button>
                  )}
                </>
              )}

              {showAddForm && (
                <div className="mt-3 space-y-2 rounded-xl bg-background p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={newAddr.label}
                        onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pincode</Label>
                      <Input
                        value={newAddr.pincode}
                        maxLength={6}
                        onChange={(e) =>
                          setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, "") })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Full Address</Label>
                    <Input
                      value={newAddr.full_address}
                      onChange={(e) =>
                        setNewAddr({ ...newAddr, full_address: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={saveNewAddress}
                      className="flex-1 bg-primary text-primary-foreground"
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* Slot */}
            {slots.length > 0 && (
              <section className="mt-4 rounded-2xl bg-card p-4">
                <h2 className="mb-2 font-display font-bold text-primary">Delivery Slot</h2>
                <RadioGroup value={slotId} onValueChange={setSlotId}>
                  {slots.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-background"
                    >
                      <RadioGroupItem value={s.id} />
                      <div className="text-sm">
                        <p className="font-semibold text-primary">{s.slot_label}</p>
                        <p className="text-xs text-muted-foreground">{s.slot_date}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </section>
            )}

            {/* Payment */}
            <section className="mt-4 rounded-2xl bg-card p-4">
              <h2 className="mb-2 font-display font-bold text-primary">Payment</h2>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "cod" | "upi")}
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-background">
                  <RadioGroupItem value="cod" />
                  <span className="text-sm font-semibold text-primary">💵 Cash on Delivery</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-background">
                  <RadioGroupItem value="upi" />
                  <span className="text-sm font-semibold text-primary">📱 UPI</span>
                </label>
              </RadioGroup>
            </section>

            {/* Totals */}
            <section className="mt-4 rounded-2xl bg-card p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{sub.toFixed(0)}</span>
              </div>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>Delivery charge</span>
                <span>{dc === 0 ? "FREE" : `₹${dc}`}</span>
              </div>
              <div className="mt-2 border-t border-border pt-2 flex justify-between font-display text-base font-bold text-primary">
                <span>Total</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
            </section>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-background/95 p-3 backdrop-blur">
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={submitting || authLoading}
            onClick={placeOrder}
            className="h-12 w-full rounded-full bg-primary font-display text-base font-bold text-primary-foreground shadow-md disabled:opacity-60"
          >
            {submitting ? "Placing order…" : !user ? "Sign in to Place Order" : `Place Order · ₹${total.toFixed(0)}`}
          </motion.button>
        </div>
      )}
    </div>
  );
}
