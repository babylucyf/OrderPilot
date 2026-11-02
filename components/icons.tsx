const P: Record<string, string> = {
  today: "M3.5 8.5 10 3l6.5 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-4v5H4.5a1 1 0 0 1-1-1z",
  orders: "M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11.5l-2.5-1.5-2 1.5-2-1.5-2 1.5-2.5-1.5V5A1.5 1.5 0 0 1 6 3.5zM7.5 7.5h5M7.5 10.5h5M7.5 13.5h3",
  capture: "M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1zM10 6.8v4.4M7.8 9h4.4",
  production: "M4 10.5h12v5.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM5.5 10.5V8.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2M10 7.5V5.5M10 4v.01M4 13.5c1.3 0 1.3 1 2.7 1s1.3-1 2.6-1 1.3 1 2.7 1 1.3-1 2.7-1",
  external: "M11 3.5h5.5V9M16.5 3.5 9 11M14 12v3.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H8",
  search: "M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM17 17l-3.8-3.8",
  clock: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6.5V10l2.5 1.5",
  reset: "M3.5 10a6.5 6.5 0 1 0 2-4.7M3.5 3.5v3.3h3.3",
  print: "M5.5 7.5V3.5h9v4M5.5 14H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-1.5M5.5 11.5h9V17h-9z",
  user: "M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10zM3.5 17c.8-3 3.4-4.5 6.5-4.5s5.7 1.5 6.5 4.5",
  chevron: "M7.5 5l5 5-5 5",
  down: "M5 7.5l5 5 5-5",
  close: "M5 5l10 10M15 5 5 15",
  truck: "M2.5 5.5h9v8h-9zM11.5 8.5h3l2.5 2.5v2.5h-5.5M5.5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  wallet: "M3.5 6.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM3.5 6.5l9-3v3M13 11.5h1.5",
  confirm: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7 10.2l2 2 4-4.4",
  calendar: "M4 5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 8.5h14M7 3v3.5M13 3v3.5",
  plus: "M10 4v12M4 10h12",
  alert: "M10 3.5 17.5 16.5h-15zM10 8.5v3.5M10 14.3v.01",
  help: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8 8a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.5M10 13.8v.01",
  // progress steps
  request: "M5 3.5h7l3 3v10H5zM8 9.5h4M8 12.5h4",
  quote: "M4 5.5h12v9H4zM4 8.5h12M7 11.5h3",
  paid: "M3.5 6h13v8h-13zM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  cake: "M4 10h12v6H4zM6 10V8h8v2M10 8V6M4 13c1.3 0 1.3 1 2.7 1s1.3-1 2.6-1 1.3 1 2.7 1 1.3-1 2.7-1",
  handoff: "M10 17s5-4.4 5-8.5a5 5 0 1 0-10 0c0 4.1 5 8.5 5 8.5zM10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
};

export function Icon({ name, size = 20, className, strokeWidth = 1.6 }: { name: keyof typeof P | string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] ?? ""} />
    </svg>
  );
}
