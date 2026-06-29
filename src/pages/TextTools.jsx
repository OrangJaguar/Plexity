import React, { useState, useMemo } from "react";
import { Type, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ToolLayout from "@/components/tools/ToolLayout";
import ToolCard from "@/components/tools/ToolCard";
import { useToast } from "@/components/ui/use-toast";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0;
    const paragraphs = text.trim() ? text.split(/\n\n+/).filter(s => s.trim()).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, sentences, paragraphs, readTime };
  }, [text]);

  return (
    <ToolCard title="Word Counter">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type your text here..."
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[120px] mb-4"
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Words", value: stats.words },
          { label: "Characters", value: stats.chars },
          { label: "Sentences", value: stats.sentences },
          { label: "Paragraphs", value: stats.paragraphs },
          { label: "Read Time", value: `${stats.readTime}m` },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

function CaseConverter() {
  const [text, setText] = useState("");
  const { copied, copy } = useCopy();

  const convert = (type) => {
    switch (type) {
      case "upper": return text.toUpperCase();
      case "lower": return text.toLowerCase();
      case "title": return text.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
      case "sentence": return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      case "toggle": return text.split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join("");
      default: return text;
    }
  };

  return (
    <ToolCard title="Case Converter">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to convert..."
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[80px] mb-4"
      />
      <div className="flex flex-wrap gap-2">
        {[
          { label: "UPPER", type: "upper" },
          { label: "lower", type: "lower" },
          { label: "Title Case", type: "title" },
          { label: "Sentence case", type: "sentence" },
          { label: "tOGGLE", type: "toggle" },
        ].map((b) => (
          <Button
            key={b.type}
            variant="outline"
            size="sm"
            onClick={() => { setText(convert(b.type)); }}
            className="bg-white/5 border-white/10 text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30"
          >
            {b.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(text)}
          className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 ml-auto"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </ToolCard>
  );
}

function LoremGenerator() {
  const [count, setCount] = useState(3);
  const { copied, copy } = useCopy();

  const sentences = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
    "Nulla facilisi morbi tempus iaculis urna id volutpat lacus.",
    "Amet nisl suscipit adipiscing bibendum est ultricies integer quis.",
    "Vitae turpis massa sed elementum tempus egestas sed.",
    "Pellentesque habitant morbi tristique senectus et netus et malesuada.",
    "Facilisis magna etiam tempor orci eu lobortis elementum nibh.",
    "Vulputate odio ut enim blandit volutpat maecenas volutpat blandit.",
    "Scelerisque felis imperdiet proin fermentum leo vel orci porta."
  ];

  const generate = () => {
    let result = [];
    for (let i = 0; i < count; i++) {
      const sentenceCount = 3 + Math.floor(Math.random() * 4);
      const para = Array.from({ length: sentenceCount }, () => sentences[Math.floor(Math.random() * sentences.length)]).join(" ");
      result.push(para);
    }
    return result.join("\n\n");
  };

  const [output, setOutput] = useState(generate());

  return (
    <ToolCard title="Lorem Ipsum Generator">
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Paragraphs:</label>
        <Input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          className="w-20 bg-white/5 border-white/10 text-white"
        />
        <Button
          size="sm"
          onClick={() => setOutput(generate())}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Generate
        </Button>
        <Button variant="outline" size="sm" onClick={() => copy(output)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-400 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
        {output}
      </div>
    </ToolCard>
  );
}

function TextReverser() {
  const [text, setText] = useState("");
  const { copied, copy } = useCopy();
  const reversed = text.split("").reverse().join("");

  return (
    <ToolCard title="Text Reverser">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to reverse..."
        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[60px] mb-3"
      />
      {text && (
        <div className="flex items-start gap-2">
          <div className="flex-1 bg-white/5 rounded-xl p-4 text-sm text-emerald-300 break-all">{reversed}</div>
          <Button variant="outline" size="sm" onClick={() => copy(reversed)} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </ToolCard>
  );
}

export default function TextTools() {
  return (
    <ToolLayout title="Text Tools" icon={Type} color="from-emerald-500 to-teal-600">
      <div className="space-y-6">
        <WordCounter />
        <CaseConverter />
        <LoremGenerator />
        <TextReverser />
      </div>
    </ToolLayout>
  );
}