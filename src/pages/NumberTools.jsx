import React, { useState } from "react";
import { Hash, ArrowRightLeft, Percent, Shuffle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToolLayout from "@/components/tools/ToolLayout";
import ToolCard from "@/components/tools/ToolCard";

const unitData = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144 },
  Weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 907.185 },
  Temperature: "special",
  Speed: { "m/s": 1, "km/h": 0.277778, mph: 0.44704, knots: 0.514444 },
  Area: { "m²": 1, "km²": 1e6, "ft²": 0.092903, "mi²": 2.59e6, acre: 4046.86, hectare: 10000 },
};

function convertTemp(val, from, to) {
  let celsius;
  if (from === "°C") celsius = val;
  else if (from === "°F") celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  if (to === "°C") return celsius;
  if (to === "°F") return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

function UnitConverter() {
  const [category, setCategory] = useState("Length");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("km");
  const [value, setValue] = useState("1");

  const isTemp = category === "Temperature";
  const units = isTemp ? ["°C", "°F", "K"] : Object.keys(unitData[category]);

  const result = (() => {
    const v = parseFloat(value);
    if (isNaN(v)) return "";
    if (isTemp) return convertTemp(v, fromUnit, toUnit).toFixed(4);
    const factors = unitData[category];
    return ((v * factors[fromUnit]) / factors[toUnit]).toFixed(6).replace(/\.?0+$/, "");
  })();

  return (
    <ToolCard title="Unit Converter">
      <div className="space-y-4">
        <Select value={category} onValueChange={(v) => { setCategory(v); const u = v === "Temperature" ? ["°C", "°F", "K"] : Object.keys(unitData[v]); setFromUnit(u[0]); setToUnit(u[1]); }}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.keys(unitData).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white" />
            <Select value={fromUnit} onValueChange={setFromUnit}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ArrowRightLeft className="w-5 h-5 text-gray-500 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="bg-white/5 rounded-md border border-white/10 px-3 py-2 text-emerald-400 font-mono text-sm min-h-[40px] flex items-center">
              {result || "—"}
            </div>
            <Select value={toUnit} onValueChange={setToUnit}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

function TipCalculator() {
  const [bill, setBill] = useState("50");
  const [tipPct, setTipPct] = useState(18);
  const [people, setPeople] = useState(1);

  const billNum = parseFloat(bill) || 0;
  const tip = billNum * tipPct / 100;
  const total = billNum + tip;
  const perPerson = people > 0 ? total / people : total;

  return (
    <ToolCard title="Tip Calculator">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bill Amount ($)</label>
          <Input value={bill} onChange={(e) => setBill(e.target.value)} type="number" className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-2 block">Tip: {tipPct}%</label>
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 18, 20, 25].map(p => (
              <Button key={p} size="sm" variant={tipPct === p ? "default" : "outline"}
                onClick={() => setTipPct(p)}
                className={tipPct === p ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}>
                {p}%
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Split Between</label>
          <Input value={people} onChange={(e) => setPeople(parseInt(e.target.value) || 1)} type="number" min={1} className="w-24 bg-white/5 border-white/10 text-white" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tip", value: `$${tip.toFixed(2)}` },
            { label: "Total", value: `$${total.toFixed(2)}` },
            { label: "Per Person", value: `$${perPerson.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function PercentageCalc() {
  const [a, setA] = useState("25");
  const [b, setB] = useState("200");

  const aNum = parseFloat(a) || 0;
  const bNum = parseFloat(b) || 0;

  return (
    <ToolCard title="Percentage Calculator">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap text-sm text-gray-300">
          <span>What is</span>
          <Input value={a} onChange={(e) => setA(e.target.value)} type="number" className="w-20 bg-white/5 border-white/10 text-white" />
          <span>% of</span>
          <Input value={b} onChange={(e) => setB(e.target.value)} type="number" className="w-24 bg-white/5 border-white/10 text-white" />
          <span>?</span>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-emerald-400">{(aNum * bNum / 100).toFixed(2)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-gray-500 text-xs mb-1">{a} is what % of {b}?</div>
            <div className="font-bold text-white">{bNum ? (aNum / bNum * 100).toFixed(2) : 0}%</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-gray-500 text-xs mb-1">% change from {a} to {b}</div>
            <div className="font-bold text-white">{aNum ? (((bNum - aNum) / aNum) * 100).toFixed(2) : 0}%</div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

function RandomNumberGen() {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [result, setResult] = useState(null);

  const generate = () => {
    const lo = parseInt(min) || 0;
    const hi = parseInt(max) || 100;
    setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  };

  return (
    <ToolCard title="Random Number Generator">
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Min</label>
          <Input value={min} onChange={(e) => setMin(e.target.value)} type="number" className="w-24 bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Max</label>
          <Input value={max} onChange={(e) => setMax(e.target.value)} type="number" className="w-24 bg-white/5 border-white/10 text-white" />
        </div>
        <Button onClick={generate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Shuffle className="w-4 h-4 mr-2" /> Generate
        </Button>
      </div>
      {result !== null && (
        <div className="bg-white/5 rounded-xl p-6 text-center">
          <div className="text-5xl font-bold text-emerald-400 font-mono">{result}</div>
        </div>
      )}
    </ToolCard>
  );
}

export default function NumberTools() {
  return (
    <ToolLayout title="Number Tools" icon={Hash} color="from-amber-500 to-orange-600">
      <div className="space-y-6">
        <UnitConverter />
        <TipCalculator />
        <PercentageCalc />
        <RandomNumberGen />
      </div>
    </ToolLayout>
  );
}