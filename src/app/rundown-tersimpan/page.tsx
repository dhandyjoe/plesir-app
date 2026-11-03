import type { Metadata } from "next";
import { AccountMenu } from "@/components/account-menu";
import { Brand } from "@/components/brand";
import { AccountIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import header from "../rundown/rundown.module.css";
import { SavedList } from "./saved-list";
import styles from "./saved.module.css";

export const metadata: Metadata = {
  title: "Rundown Tersimpan — plesir.app",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className={styles.page}>
      <header className={header.header}>
        <div className={header.headerInner}>
          <Brand />

          <SiteNav />

          <div className={header.headerActions}>
            <AccountMenu
              className={header.primaryAction}
              guest={
                <>
                  <AccountIcon />
                  <span className={header.hideOnMobile}>Masuk / Daftar</span>
                </>
              }
            />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <SavedList />
      </main>

      <SiteFooter />
    </div>
  );
}
