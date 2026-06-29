import React, { useState } from "react";
import { KeyRound, Copy, Check, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import ToolLayout from "@/components/tools/ToolLayout";
import ToolCard from "@/components/tools/ToolCard";
import { useToast } from "@/components/ui/use-toast";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const { copied, copy } = useCopy();

  const generate = () => {
    let chars = "";
    if (upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lower) chars += "abcdefghijklmnopqrstuvwxyz";
    if (numbers) chars += "0123456789";
    if (symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const [password, setPassword] = useState(generate);

  const strength = (() => {
    let score = 0;
    if (length >= 12) score++;
    if (length >= 16) score++;
    if (upper && lower) score++;
    if (numbers) score++;
    if (symbols) score++;
    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%" };
    if (score <= 3) return { label: "Medium", color: "bg-amber-500", width: "66%" };
    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  })();

  return (
    <ToolCard title="Password Generator">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 font-mono text-sm text-emerald-300 break-all select-all">
            {password}
          </div>
          <Button variant="outline" size="icon" onClick={() => copy(password)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button size="icon" onClick={() => setPassword(generate())} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Length: {length}</span>
            <span className={`${strength.label === "Strong" ? "text-emerald-400" : strength.label === "Medium" ? "text-amber-400" : "text-red-400"}`}>
              {strength.label}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
            <div className={`h-1.5 rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
          </div>
          <Slider value={[length]} onValueChange={([v]) => { setLength(v); setPassword(generate()); }} min={6} max={64} step={1} className="mb-4" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Uppercase (A-Z)", checked: upper, set: setUpper },
            { label: "Lowercase (a-z)", checked: lower, set: setLower },
            { label: "Numbers (0-9)", checked: numbers, set: setNumbers },
            { label: "Symbols (!@#$)", checked: symbols, set: setSymbols },
          ].map(opt => (
            <label key={opt.label} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <Switch checked={opt.checked} onCheckedChange={(v) => { opt.set(v); }} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function UUIDGenerator() {
  const { copied, copy } = useCopy();
  const gen = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });

  const [uuids, setUuids] = useState(() => Array.from({ length: 5 }, gen));

  return (
    <ToolCard title="UUID Generator">
      <div className="space-y-2 mb-4">
        {uuids.map((u, i) => (
          <button key={i} onClick={() => copy(u)} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 transition rounded-lg px-4 py-2.5 group">
            <span className="font-mono text-sm text-gray-300">{u}</span>
            <Copy className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition shrink-0 ml-2" />
          </button>
        ))}
      </div>
      <Button onClick={() => setUuids(Array.from({ length: 5 }, gen))} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <RefreshCw className="w-4 h-4 mr-2" /> Generate New
      </Button>
    </ToolCard>
  );
}

function FakeDataGenerator() {
  const firstNames = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Aiden", "Mia", "Lucas", "Charlotte", "Logan"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas"];
  const domains = ["gmail.com", "outlook.com", "yahoo.com", "protonmail.com", "example.org"];
  const streets = ["Oak Ave", "Maple Dr", "Cedar Ln", "Pine St", "Elm Blvd", "Birch Way", "Spruce Ct", "Willow Rd"];
  const cities = ["Austin", "Denver", "Portland", "Seattle", "Miami", "Chicago", "Boston", "Phoenix"];
  const companies = ["Acme Corp", "TechNova", "BlueSky Inc", "GreenLeaf", "DataFlow", "CloudPeak", "NexGen", "Quantum Labs"];
  const jobs = ["Engineer", "Designer", "Manager", "Analyst", "Developer", "Consultant", "Director", "Specialist"];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const { toast } = useToast();

  const genPerson = () => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(domains)}`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      address: `${Math.floor(Math.random() * 9999) + 1} ${pick(streets)}, ${pick(cities)}`,
      company: pick(companies),
      job: pick(jobs),
      age: Math.floor(Math.random() * 45) + 20,
    };
  };

  const [people, setPeople] = useState(() => Array.from({ length: 3 }, genPerson));

  const copyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(people, null, 2));
    toast({ title: "Copied JSON!" });
  };

  return (
    <ToolCard title="Fake Data Generator">
      <div className="space-y-3 mb-4">
        {people.map((p, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 space-y-1.5">
            <div className="font-semibold text-white">{p.name}, {p.age}</div>
            <div className="text-xs text-gray-500">{p.email}</div>
            <div className="text-xs text-gray-500">{p.phone} • {p.address}</div>
            <div className="text-xs text-emerald-400/70">{p.job} at {p.company}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setPeople(Array.from({ length: 3 }, genPerson))} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
        </Button>
        <Button variant="outline" onClick={copyAll} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
          <Copy className="w-4 h-4 mr-2" /> Copy JSON
        </Button>
      </div>
    </ToolCard>
  );
}

export default function GeneratorTools() {
  return (
    <ToolLayout title="Generator Tools" icon={KeyRound} color="from-rose-500 to-pink-600">
      <div className="space-y-6">
        <PasswordGenerator />
        <UUIDGenerator />
        <FakeDataGenerator />
      </div>
    </ToolLayout>
  );
}