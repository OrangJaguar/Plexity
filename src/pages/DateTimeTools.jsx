import React, { useState, useEffect, useRef } from "react";
import { Clock, Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToolLayout from "@/components/tools/ToolLayout";
import ToolCard from "@/components/tools/ToolCard";

function Stopwatch() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setTime(t => t + 10), 10);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const format = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  return (
    <ToolCard title="Stopwatch">
      <div className="text-center mb-6">
        <div className="text-5xl sm:text-6xl font-mono font-bold text-emerald-400 tracking-wider">
          {format(time)}
        </div>
      </div>
      <div className="flex justify-center gap-3 mb-4">
        <Button onClick={() => setRunning(!running)} className={running ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}>
          {running ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Start</>}
        </Button>
        <Button variant="outline" onClick={() => { if (running) setLaps(l => [...l, time]); }} disabled={!running} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
          Lap
        </Button>
        <Button variant="outline" onClick={() => { setRunning(false); setTime(0); setLaps([]); }} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
      {laps.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {laps.map((l, i) => (
            <div key={i} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
              <span className="text-gray-500">Lap {i + 1}</span>
              <span className="font-mono text-gray-300">{format(l)}</span>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  );
}

function CountdownTimer() {
  const [inputMin, setInputMin] = useState(5);
  const [inputSec, setInputSec] = useState(0);
  const [time, setTime] = useState(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && time > 0) {
      intervalRef.current = setInterval(() => setTime(t => Math.max(0, t - 1000)), 1000);
    } else {
      clearInterval(intervalRef.current);
      if (time === 0 && running) setRunning(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, time]);

  const format = (ms) => {
    if (ms === null) return "--:--";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const start = () => {
    setTime((inputMin * 60 + inputSec) * 1000);
    setRunning(true);
  };

  return (
    <ToolCard title="Countdown Timer">
      {time === null || (!running && time > 0) ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Minutes</label>
              <Input type="number" min={0} value={inputMin} onChange={e => setInputMin(parseInt(e.target.value) || 0)} className="w-20 bg-white/5 border-white/10 text-white text-center" />
            </div>
            <span className="text-2xl text-gray-600 mt-5">:</span>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Seconds</label>
              <Input type="number" min={0} max={59} value={inputSec} onChange={e => setInputSec(parseInt(e.target.value) || 0)} className="w-20 bg-white/5 border-white/10 text-white text-center" />
            </div>
          </div>
          <div className="text-center">
            <Button onClick={start} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Timer className="w-4 h-4 mr-2" /> Start Countdown
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className={`text-6xl font-mono font-bold tracking-wider ${time === 0 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
            {format(time)}
          </div>
          {time === 0 && <div className="text-lg text-red-400 font-semibold">Time's up!</div>}
          <div className="flex justify-center gap-3">
            {time > 0 && (
              <Button onClick={() => setRunning(!running)} className={running ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}>
                {running ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Resume</>}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setRunning(false); setTime(null); }} className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

function DateDiffCalc() {
  const today = new Date().toISOString().split("T")[0];
  const [date1, setDate1] = useState(today);
  const [date2, setDate2] = useState("");

  const diff = date1 && date2 ? (() => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = Math.abs(d2 - d1);
    const days = Math.floor(diffMs / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30.44);
    const years = Math.floor(days / 365.25);
    const hours = Math.floor(diffMs / 3600000);
    return { days, weeks, months, years, hours };
  })() : null;

  return (
    <ToolCard title="Date Difference Calculator">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <div className="flex-1 w-full">
          <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
          <Input type="date" value={date1} onChange={e => setDate1(e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <span className="text-gray-600 mt-4 hidden sm:block">→</span>
        <div className="flex-1 w-full">
          <label className="text-xs text-gray-500 mb-1 block">End Date</label>
          <Input type="date" value={date2} onChange={e => setDate2(e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
      </div>
      {diff && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Days", value: diff.days },
            { label: "Weeks", value: diff.weeks },
            { label: "Months", value: diff.months },
            { label: "Years", value: diff.years },
            { label: "Hours", value: diff.hours.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  );
}

function TimezoneConverter() {
  const zones = [
    { label: "UTC", offset: 0 },
    { label: "EST (New York)", offset: -5 },
    { label: "CST (Chicago)", offset: -6 },
    { label: "MST (Denver)", offset: -7 },
    { label: "PST (LA)", offset: -8 },
    { label: "GMT (London)", offset: 0 },
    { label: "CET (Paris)", offset: 1 },
    { label: "IST (Mumbai)", offset: 5.5 },
    { label: "CST (Beijing)", offset: 8 },
    { label: "JST (Tokyo)", offset: 9 },
    { label: "AEST (Sydney)", offset: 10 },
    { label: "NZST (Auckland)", offset: 12 },
  ];

  const [fromZone, setFromZone] = useState("EST (New York)");
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(0);

  const fromOffset = zones.find(z => z.label === fromZone)?.offset || 0;

  return (
    <ToolCard title="Timezone Converter">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Time</label>
          <div className="flex gap-1">
            <Input type="number" min={0} max={23} value={hour} onChange={e => setHour(parseInt(e.target.value) || 0)} className="w-16 bg-white/5 border-white/10 text-white text-center" />
            <span className="text-gray-500 self-center">:</span>
            <Input type="number" min={0} max={59} value={minute} onChange={e => setMinute(parseInt(e.target.value) || 0)} className="w-16 bg-white/5 border-white/10 text-white text-center" />
          </div>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-gray-500 mb-1 block">From</label>
          <Select value={fromZone} onValueChange={setFromZone}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>{zones.map(z => <SelectItem key={z.label} value={z.label}>{z.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {zones.filter(z => z.label !== fromZone).map(z => {
          const utcHour = hour - fromOffset;
          const targetHour = ((utcHour + z.offset) % 24 + 24) % 24;
          return (
            <div key={z.label} className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1 truncate">{z.label}</div>
              <div className="font-mono font-bold text-white">
                {String(Math.floor(targetHour)).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </div>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

export default function DateTimeTools() {
  return (
    <ToolLayout title="Date & Time Tools" icon={Clock} color="from-sky-500 to-blue-600">
      <div className="space-y-6">
        <Stopwatch />
        <CountdownTimer />
        <DateDiffCalc />
        <TimezoneConverter />
      </div>
    </ToolLayout>
  );
}