"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";
import { Upload, FileText, Check, Loader2, AlertTriangle } from "lucide-react";

export default function PricingSettingsPage() {
  const { data: pricing, isLoading, refetch } = trpc.pricing.get.useQuery();
  const parseFile = trpc.pricing.parseFile.useMutation();
  const upsert = trpc.pricing.upsert.useMutation({ onSuccess: () => refetch() });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const text = await file.text();
    try {
      const result = await parseFile.mutateAsync({ fileContent: text, fileName: file.name });
      await upsert.mutateAsync({ data: result.parsed as any });
    } catch (err) {
      console.error("Parse/upload failed:", err);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pricing matrix</h1>
        <p className="text-sm text-muted-foreground">Upload your service rates. The AI agent uses these to generate quotes on calls.</p>
      </div>

      {/* Upload area */}
      <div className="max-w-2xl rounded-xl border-2 border-dashed border-border bg-card p-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">Upload pricing CSV</p>
        <p className="mt-1 text-xs text-muted-foreground">Format: Category, Line Item, Unit (sqft/hour/each/flat/day), Unit Price, Minimum</p>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {uploading ? "Processing..." : "Choose file"}
        </button>
      </div>

      {/* Current matrix */}
      {pricing?.exists && pricing.data ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Current matrix (v{pricing.version})</h2>
            <p className="text-xs text-muted-foreground">Updated {pricing.updatedAt ? new Date(pricing.updatedAt).toLocaleDateString() : "—"}</p>
          </div>
          {pricing.data.categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border bg-muted/50 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.emergencyType.replace("_", " ")}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Item</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Minimum</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cat 3 mult</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cat.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2 text-foreground">{item.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.unit.replace("_", " ").toLowerCase()}</td>
                      <td className="px-4 py-2 text-right text-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrency(item.minimumCharge)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.multipliers.cat3}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">No pricing matrix uploaded</p>
          </div>
          <p className="mt-1 text-xs text-amber-600">The AI agent will use industry-average fallback pricing until you upload your own rates.</p>
        </div>
      )}
    </div>
  );
}
