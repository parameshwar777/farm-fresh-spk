import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((row: { key: string; value: string }) => {
          map[row.key] = row.value;
        });
        setSettings(map);
      });
  }, []);

  const update = (key: string, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-primary">Settings</h2>

      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div>
          <Label>Minimum Order Amount (₹)</Label>
          <Input
            type="number"
            value={settings.min_order_amount ?? ""}
            onChange={(e) => update("min_order_amount", e.target.value)}
          />
        </div>
        <div>
          <Label>Delivery Charge (₹)</Label>
          <Input
            type="number"
            value={settings.delivery_charge ?? ""}
            onChange={(e) => update("delivery_charge", e.target.value)}
          />
        </div>
        <div>
          <Label>Free Delivery Above (₹)</Label>
          <Input
            type="number"
            value={settings.free_delivery_above ?? ""}
            onChange={(e) => update("free_delivery_above", e.target.value)}
          />
        </div>
        <label className="flex items-center justify-between rounded-xl bg-background p-3">
          <span className="font-semibold text-primary">Store Open</span>
          <Switch
            checked={settings.store_open === "true"}
            onCheckedChange={(v) => update("store_open", v ? "true" : "false")}
          />
        </label>
        <div>
          <Label>Store Closed Message</Label>
          <Textarea
            value={settings.store_message ?? ""}
            onChange={(e) => update("store_message", e.target.value)}
          />
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground"
        >
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* App version controls */}
      <div className="mt-4 space-y-3 rounded-2xl bg-card p-4">
        <div>
          <h3 className="font-display font-bold text-primary">App Version Control</h3>
          <p className="text-xs text-muted-foreground">
            Force users on older app builds to update before they can use the app.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Current Version</Label>
            <Input
              placeholder="1.0.1"
              value={settings.current_app_version ?? ""}
              onChange={(e) => update("current_app_version", e.target.value)}
            />
          </div>
          <div>
            <Label>Minimum Required</Label>
            <Input
              placeholder="1.0.0"
              value={settings.min_app_version ?? ""}
              onChange={(e) => update("min_app_version", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Update Message</Label>
          <Textarea
            placeholder="A new version is available. Please update to continue."
            value={settings.app_update_message ?? ""}
            onChange={(e) => update("app_update_message", e.target.value)}
          />
        </div>
        <div>
          <Label>Play Store URL (Android)</Label>
          <Input
            placeholder="https://play.google.com/store/apps/details?id=..."
            value={settings.app_store_url_android ?? ""}
            onChange={(e) => update("app_store_url_android", e.target.value)}
          />
        </div>
        <div>
          <Label>App Store URL (iOS)</Label>
          <Input
            placeholder="https://apps.apple.com/app/..."
            value={settings.app_store_url_ios ?? ""}
            onChange={(e) => update("app_store_url_ios", e.target.value)}
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground"
        >
          {saving ? "Saving…" : "Save Version Settings"}
        </Button>
      </div>
    </div>
  );
}
