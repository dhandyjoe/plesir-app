import Link from "next/link";
import { SparkleIcon } from "./icons";
import styles from "./brand.module.css";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link className={`${styles.brand} ${className}`} href="/" aria-label="plesir.app, beranda">
      <svg className={styles.brandMark} viewBox="0 0 512 512" aria-hidden="true">
        <rect width="512" height="512" rx="172" fill="#6d595e" />
        <circle cx="256" cy="256" r="106.5" fill="none" stroke="#fff" strokeWidth="23" />
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M203 309 285.5 285.5 309 203 226.5 226.5Z M256 238a18 18 0 1 0 0 36a18 18 0 1 0 0-36Z"
        />
      </svg>
      <span className={styles.brandName}>plesir.app</span>
      <span className={styles.brandSparkle} aria-hidden="true">
        <SparkleIcon />
      </span>
    </Link>
  );
}
