/**
 * 20 distinct category colors — used everywhere a category appears
 * (category pills, editor dropdowns, sentiment rules, sources).
 * Colors are picked to be distinguishable in both light and dark mode.
 */
const CATEGORY_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-100 dark:bg-blue-900/40" },
  { bg: "bg-emerald-500", text: "text-emerald-500", light: "bg-emerald-100 dark:bg-emerald-900/40" },
  { bg: "bg-amber-500", text: "text-amber-500", light: "bg-amber-100 dark:bg-amber-900/40" },
  { bg: "bg-rose-500", text: "text-rose-500", light: "bg-rose-100 dark:bg-rose-900/40" },
  { bg: "bg-violet-500", text: "text-violet-500", light: "bg-violet-100 dark:bg-violet-900/40" },
  { bg: "bg-cyan-500", text: "text-cyan-500", light: "bg-cyan-100 dark:bg-cyan-900/40" },
  { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-100 dark:bg-orange-900/40" },
  { bg: "bg-pink-500", text: "text-pink-500", light: "bg-pink-100 dark:bg-pink-900/40" },
  { bg: "bg-teal-500", text: "text-teal-500", light: "bg-teal-100 dark:bg-teal-900/40" },
  { bg: "bg-indigo-500", text: "text-indigo-500", light: "bg-indigo-100 dark:bg-indigo-900/40" },
  { bg: "bg-lime-500", text: "text-lime-500", light: "bg-lime-100 dark:bg-lime-900/40" },
  { bg: "bg-fuchsia-500", text: "text-fuchsia-500", light: "bg-fuchsia-100 dark:bg-fuchsia-900/40" },
  { bg: "bg-sky-500", text: "text-sky-500", light: "bg-sky-100 dark:bg-sky-900/40" },
  { bg: "bg-red-500", text: "text-red-500", light: "bg-red-100 dark:bg-red-900/40" },
  { bg: "bg-green-500", text: "text-green-500", light: "bg-green-100 dark:bg-green-900/40" },
  { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-100 dark:bg-yellow-900/40" },
  { bg: "bg-purple-500", text: "text-purple-500", light: "bg-purple-100 dark:bg-purple-900/40" },
  { bg: "bg-stone-500", text: "text-stone-500", light: "bg-stone-100 dark:bg-stone-900/40" },
  { bg: "bg-zinc-500", text: "text-zinc-500", light: "bg-zinc-100 dark:bg-zinc-900/40" },
  { bg: "bg-slate-500", text: "text-slate-500", light: "bg-slate-100 dark:bg-slate-900/40" },
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

/**
 * Get a stable color for a category based on its index.
 * The index is determined by the order categories were defined.
 */
export function getCategoryColor(index: number): CategoryColor {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

/**
 * Small colored square shown before category names.
 * Use this everywhere a category label appears for visual consistency.
 */
export function CategoryDot({ index, className }: { index: number; className?: string }) {
  const color = getCategoryColor(index)
  return (
    <span
      className={`inline-block size-2.5 rounded-sm shrink-0 ${color.bg} ${className ?? ""}`}
      aria-hidden="true"
    />
  )
}
