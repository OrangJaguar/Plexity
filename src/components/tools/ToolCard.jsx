import React from "react";

export default function ToolCard({ title, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
      {title && <h3 className="text-base font-semibold mb-4 text-gray-200">{title}</h3>}
      {children}
    </div>
  );
}