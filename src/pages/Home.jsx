import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Type, Palette, Hash, KeyRound, Clock, Code2, 
  ArrowRight, Sparkles, Zap, Shield, Wrench
} from "lucide-react";
import { motion } from "framer-motion";

const toolCategories = [
  {
    title: "Text Tools",
    description: "Transform, analyze, and generate text",
    icon: Type,
    path: "/text-tools",
    color: "from-emerald-500 to-teal-600",
    tools: ["Word Counter", "Case Converter", "Lorem Generator", "Text Reverser"]
  },
  {
    title: "Color Tools",
    description: "Pick, convert, and explore colors",
    icon: Palette,
    path: "/color-tools",
    color: "from-violet-500 to-purple-600",
    tools: ["Color Picker", "Palette Generator", "Contrast Checker"]
  },
  {
    title: "Number Tools",
    description: "Calculate, convert, and crunch numbers",
    icon: Hash,
    path: "/number-tools",
    color: "from-amber-500 to-orange-600",
    tools: ["Unit Converter", "Tip Calculator", "Percentage Calc", "Random Number"]
  },
  {
    title: "Generator Tools",
    description: "Generate passwords, UUIDs, and data",
    icon: KeyRound,
    path: "/generator-tools",
    color: "from-rose-500 to-pink-600",
    tools: ["Password Generator", "UUID Generator", "Fake Data"]
  },
  {
    title: "Date & Time",
    description: "Timers, countdowns, and date math",
    icon: Clock,
    path: "/datetime-tools",
    color: "from-sky-500 to-blue-600",
    tools: ["Stopwatch", "Countdown Timer", "Date Diff", "Timezone"]
  },
  {
    title: "Encoder Tools",
    description: "Encode, decode, format, and hash",
    icon: Code2,
    path: "/encoder-tools",
    color: "from-lime-500 to-green-600",
    tools: ["Base64", "URL Encode", "JSON Formatter", "Hash Generator"]
  }
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">
              Veridian <span className="text-emerald-400">Tools</span>
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-gray-400 text-base sm:text-lg max-w-xl leading-relaxed"
          >
            A curated collection of developer & everyday utilities. Fast, beautiful, and always free.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4 mt-8"
          >
            {[
              { icon: Zap, text: "Instant Results" },
              { icon: Shield, text: "Privacy First" },
              { icon: Sparkles, text: "20+ Tools" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <f.icon className="w-4 h-4 text-emerald-400" />
                {f.text}
              </div>
            ))}
          </motion.div>
        </div>
      </header>

      {/* Tool Cards */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {toolCategories.map((cat) => (
            <motion.div key={cat.title} variants={item}>
              <Link to={cat.path} className="group block">
                <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:shadow-emerald-900/10 h-full">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <cat.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-emerald-300 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tools.map((t) => (
                      <span key={t} className="text-xs bg-white/[0.05] text-gray-400 px-2.5 py-1 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}