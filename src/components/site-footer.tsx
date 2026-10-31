import { GithubIcon, LinkedInIcon } from "./icons";
import styles from "./site-footer.module.css";

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`${styles.footer} ${className}`}>
      <div className={`${styles.shell} ${styles.footerInner}`}>
        <p className={styles.footerMeta}>Product by</p>
        <a
          className={styles.footerProfile}
          href="https://github.com/dhandyjoe"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="dhandyjoenathan di GitHub"
          title="GitHub"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar 24px tidak perlu optimasi next/image */}
          <img
            className={styles.footerAvatar}
            src="https://github.com/dhandyjoe.png?size=64"
            alt=""
            width={24}
            height={24}
          />
          <span>dhandyjoenathan</span>
          <GithubIcon />
        </a>
        <a
          className={styles.footerIcon}
          href="https://www.linkedin.com/in/dhandyjoenathan"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn dhandyjoenathan"
          title="LinkedIn"
        >
          <LinkedInIcon />
        </a>
      </div>
    </footer>
  );
}
