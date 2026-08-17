export const NAV_TABS = [
  { href: "/", label: "Recipes" },
  { href: "/add", label: "Add" },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/recipe")
    : pathname.startsWith(href);
}
