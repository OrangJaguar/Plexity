import React, { useState } from "react";
import { Code2, Copy, Check, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function Base64Tool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("encode");
  const { copied, copy } = useCopy();

  const output = (() => {
    if (!input) return "";
    try {
      return mode === "encode" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input)));
    } catch {
      return "Invalid input";
    }
  })();

  return (
    <ToolCard title="Base64 Encode / Decode">
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant={mode === "encode" ? "default" : "outline"}
          onClick={() => setMode("encode")}
          className={mode === "encode" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}
        >
          Encode
        </Button>
        <Button
          size="sm"
          variant={mode === "decode" ? "default" : "outline"}
          onClick={() => setMode("decode")}
          className={mode === "decode" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}
        >
          Decode
        </Button>
      </div>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[80px] mb-3"
      />
      {output && (
        <div className="flex items-start gap-2">
          <div className="flex-1 bg-white/5 rounded-xl p-4 font-mono text-sm text-emerald-300 break-all max-h-40 overflow-y-auto">{output}</div>
          <Button variant="outline" size="sm" onClick={() => copy(output)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </ToolCard>
  );
}

function URLEncodeTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("encode");
  const { copied, copy } = useCopy();

  const output = (() => {
    if (!input) return "";
    try {
      return mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
    } catch {
      return "Invalid input";
    }
  })();

  return (
    <ToolCard title="URL Encode / Decode">
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant={mode === "encode" ? "default" : "outline"} onClick={() => setMode("encode")}
          className={mode === "encode" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}>
          Encode
        </Button>
        <Button size="sm" variant={mode === "decode" ? "default" : "outline"} onClick={() => setMode("decode")}
          className={mode === "decode" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}>
          Decode
        </Button>
      </div>
      <Textarea value={input} onChange={(e) => setInput(e.target.value)}
        placeholder={mode === "encode" ? "Enter URL to encode..." : "Enter encoded URL to decode..."}
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[60px] mb-3" />
      {output && (
        <div className="flex items-start gap-2">
          <div className="flex-1 bg-white/5 rounded-xl p-4 font-mono text-sm text-emerald-300 break-all">{output}</div>
          <Button variant="outline" size="sm" onClick={() => copy(output)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </ToolCard>
  );
}

function JSONFormatter() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const { copied, copy } = useCopy();

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <ToolCard title="JSON Formatter">
      <Textarea
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(""); }}
        placeholder='{"key": "value", "array": [1, 2, 3]}'
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[150px] font-mono text-sm mb-3"
      />
      {error && <div className="text-xs text-red-400 mb-3 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
      <div className="flex gap-2">
        <Button size="sm" onClick={format} className="bg-emerald-600 hover:bg-emerald-700 text-white">Format</Button>
        <Button size="sm" variant="outline" onClick={minify} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">Minify</Button>
        <Button size="sm" variant="outline" onClick={() => copy(input)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 ml-auto">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </ToolCard>
  );
}

function HashGenerator() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState({});
  const { toast } = useToast();

  const generate = async () => {
    if (!input) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const results = {};
    for (const algo of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
      const hashBuffer = await crypto.subtle.digest(algo, data);
      results[algo] = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    setHashes(results);
  };

  const copyHash = (val) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Copied!" });
  };

  return (
    <ToolCard title="Hash Generator">
      <div className="flex gap-2 mb-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[60px]"
        />
      </div>
      <Button size="sm" onClick={generate} className="bg-emerald-600 hover:bg-emerald-700 text-white mb-4">
        Generate Hashes
      </Button>
      {Object.keys(hashes).length > 0 && (
        <div className="space-y-2">
          {Object.entries(hashes).map(([algo, hash]) => (
            <button key={algo} onClick={() => copyHash(hash)} className="w-full text-left bg-white/5 hover:bg-white/10 transition rounded-lg px-4 py-3 group">
              <div className="text-xs text-gray-500 mb-1">{algo}</div>
              <div className="font-mono text-xs text-gray-300 break-all">{hash}</div>
            </button>
          ))}
        </div>
      )}
    </ToolCard>
  );
}

export default function EncoderTools() {
  return (
    <ToolLayout title="Encoder Tools" icon={Code2} color="from-lime-500 to-green-600">
      <div className="space-y-6">
        <Base64Tool />
        <URLEncodeTool />
        <JSONFormatter />
        <HashGenerator />
      </div>
    </ToolLayout>
  );
}