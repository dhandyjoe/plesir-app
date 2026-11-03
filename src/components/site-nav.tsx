"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, GridIcon } from "./icons";
import styles from "./site-nav.module.css";

const ITEMS = [
  { href: "/", label: "Main Menu", short: "Menu", Icon: GridIcon, group: ["/", "/rundown"] },
  {
    href: "/rundown-tersimpan",
    label: "Rundown Tersimpan",
    short: "Tersimpan",
    Icon: BookmarkIcon,
    group: ["/rundown-tersimpan"],
  },
];

/** Segmented control antarhalaman utama; /rundown dianggap bagian dari Main Menu (alurnya dimulai dari sana). */
export function SiteNav() {
  const path = usePathname();

  return (
    <nav className={styles.nav} aria-label="Menu utama">
      {ITEMS.map(({ href, label, short, Icon, group }) => (
        <Link
          key={href}
          className={`${styles.item} ${group.includes(path) ? styles.active : ""}`}
          href={href}
          aria-label={label}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon />
          <span className={styles.full}>{label}</span>
          <span className={styles.short}>{short}</span>
        </Link>
      ))}
    </nav>
  );
}
