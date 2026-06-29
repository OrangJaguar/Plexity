import React, { useState, useCallback } from "react";
import { Palette, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToolLayout from "@/components/tools/ToolLayout";
import ToolCard from "@/components/tools/ToolCard";
import { useToast } from "@/components/ui/use-toast";

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function ColorPicker() {
  const [color, setColor] = useState("#10b981");
  const { toast } = useToast();
  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const copyValue = (val) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Copied: " + val });
  };

  const values = [
    { label: "HEX", value: color.toUpperCase() },
    { label: "RGB", value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: "HSL", value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
  ];

  return (
    <ToolCard title="Color Picker & Converter">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="space-y-3">
          <div className="w-full sm:w-40 h-32 rounded-xl border border-white/10 shadow-inner" style={{ backgroundColor: color }} />
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full sm:w-40 h-10 cursor-pointer bg-transparent border-white/10"
          />
          <Input
            value={color}
            onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setColor(e.target.value); }}
            className="w-full sm:w-40 bg-white/5 border-white/10 text-white font-mono text-sm"
          />
        </div>
        <div className="flex-1 space-y-3">
          {values.map((v) => (
            <button
              key={v.label}
              onClick={() => copyValue(v.value)}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 transition rounded-xl px-4 py-3 group"
            >
              <span className="text-xs text-gray-500 uppercase tracking-wider">{v.label}</span>
              <span className="text-sm font-mono text-gray-300">{v.value}</span>
              <Copy className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition" />
            </button>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function PaletteGenerator() {
  const { toast } = useToast();
  const generatePalette = () => Array.from({ length: 5 }, () => randomHex());
  const [palette, setPalette] = useState(generatePalette);

  return (
    <ToolCard title="Random Palette Generator">
      <div className="flex gap-2 mb-4 rounded-xl overflow-hidden h-28">
        {palette.map((c, i) => (
          <button
            key={i}
            onClick={() => { navigator.clipboard.writeText(c); toast({ title: "Copied: " + c }); }}
            className="flex-1 relative group transition-all hover:flex-[1.3]"
            style={{ backgroundColor: c }}
          >
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-mono bg-black/50 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              {c}
            </span>
          </button>
        ))}
      </div>
      <Button onClick={() => setPalette(generatePalette())} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <RefreshCw className="w-4 h-4 mr-2" /> New Palette
      </Button>
    </ToolCard>
  );
}

function ContrastChecker() {
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#10b981");

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const fgLum = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const ratio = ((Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05)).toFixed(2);

  const aaLarge = ratio >= 3;
  const aaNormal = ratio >= 4.5;
  const aaaLarge = ratio >= 4.5;
  const aaaNormal = ratio >= 7;

  return (
    <ToolCard title="Contrast Checker">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="space-y-3 shrink-0">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Foreground</label>
            <div className="flex gap-2">
              <Input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="w-12 h-9 cursor-pointer bg-transparent border-white/10 p-0.5" />
              <Input value={fg} onChange={(e) => setFg(e.target.value)} className="w-24 bg-white/5 border-white/10 text-white font-mono text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Background</label>
            <div className="flex gap-2">
              <Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-12 h-9 cursor-pointer bg-transparent border-white/10 p-0.5" />
              <Input value={bg} onChange={(e) => setBg(e.target.value)} className="w-24 bg-white/5 border-white/10 text-white font-mono text-sm" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="rounded-xl p-6 text-center" style={{ backgroundColor: bg, color: fg }}>
            <div className="text-2xl font-bold mb-1">Aa</div>
            <div className="text-sm">Sample text preview</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{ratio}:1</div>
            <div className="text-xs text-gray-500 mt-1">Contrast Ratio</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "AA Normal", pass: aaNormal },
              { label: "AA Large", pass: aaLarge },
              { label: "AAA Normal", pass: aaaNormal },
              { label: "AAA Large", pass: aaaLarge },
            ].map((t) => (
              <div key={t.label} className={`rounded-lg px-3 py-2 text-center font-medium ${t.pass ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {t.label}: {t.pass ? "Pass" : "Fail"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

export default function ColorTools() {
  return (
    <ToolLayout title="Color Tools" icon={Palette} color="from-violet-500 to-purple-600">
      <div className="space-y-6">
        <ColorPicker />
        <PaletteGenerator />
        <ContrastChecker />
      </div>
    </ToolLayout>
  );
}