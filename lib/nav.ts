export const NAV_TABS = [
  { href: "/", label: "Recipes" },
  { href: "/list", label: "Shop" },
  { href: "/add", label: "Add" },
  { href: "/chat", label: "Ask" },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/recipe")
    : pathname.startsWith(href);
}
