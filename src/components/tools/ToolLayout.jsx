import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wrench } from "lucide-react";
import { motion } from "framer-motion";

export default function ToolLayout({ title, icon: Icon, color, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-gray-500 hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-400">Veridian</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}