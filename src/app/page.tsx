"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Brand } from "@/components/brand";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  AccountIcon,
  CalendarIcon,
  ExploreIcon,
  LocationIcon,
  SparkleIcon,
} from "@/components/icons";
import {
  DestinationCombobox,
  type DestinationOption,
} from "./destination-combobox";
import { SiteFooter } from "@/components/site-footer";
import { formatDateRange, localDateString } from "@/lib/calendar";
import styles from "./page.module.css";

// ID Wikidata sama dengan src/data/destinations.json.
const QUICK_DESTINATIONS: (DestinationOption & { label: string })[] = [
  { id: "Q11445", name: "Kota Malang", province: "Jawa Timur", label: "Malang" },
  { id: "Q11434", name: "Kota Batu", province: "Jawa Timur", label: "Batu" },
  { id: "Q11095", name: "Kabupaten Malang", province: "Jawa Timur", label: "Kab. Malang" },
];
type FormErrors = {
  city?: string;
  dates?: string;
};

type Status = {
  tone: "info" | "error";
  message: string;
};

export default function Home() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [destination, setDestination] = useState<DestinationOption | null>(null);
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const cityRef = useRef<HTMLInputElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const rangeLabel =
    travelStart && travelEnd ? formatDateRange(travelStart, travelEnd) : "";
  function typeCity(value: string) {
    setCity(value);
    setDestination(null);
    clearCityError();
  }

  function selectDestination(option: DestinationOption) {
    setCity(option.name);
    setDestination(option);
    clearCityError();
  }

  function clearCityError() {
    setStatus(null);
    setErrors((current) =>
      current.city ? { ...current, city: undefined } : current,
    );
  }

  function clearDateError() {
    setStatus(null);
    setErrors((current) =>
      current.dates ? { ...current, dates: undefined } : current,
    );
  }

  function applyDateRange(start: string, end: string) {
    setTravelStart(start);
    setTravelEnd(end);
    clearDateError();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const validationToday = localDateString();

    if (!city.trim()) {
      nextErrors.city = "Masukkan kota tujuan dulu.";
    } else if (!destination) {
      nextErrors.city = "Pilih kota atau kabupaten dari daftar saran.";
    }

    if (!travelStart) {
      nextErrors.dates = "Pilih tanggal mulai perjalanan.";
    } else if (travelStart < validationToday) {
      nextErrors.dates = "Tanggal mulai harus hari ini atau setelahnya.";
    } else if (!travelEnd) {
      nextErrors.dates = "Pilih tanggal selesai perjalanan.";
    } else if (travelEnd < travelStart) {
      nextErrors.dates = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    }

    if (!destination || Object.keys(nextErrors).length > 0) {
      setStatus(null);
      setErrors(nextErrors);

      requestAnimationFrame(() => {
        if (nextErrors.city) {
          cityRef.current?.focus();
        } else {
          dateButtonRef.current?.focus();
        }
      });
      return;
    }

    setErrors({});

    if (!isOnline) {
      setStatus({
        tone: "error",
        message:
          "Kamu sedang offline. Sambungkan internet lalu coba lagi. Isian form tetap tersimpan.",
      });
      return;
    }

    router.push(
      `/rundown?${new URLSearchParams({
        city: destination.name,
        dest: destination.id,
        start: travelStart,
        end: travelEnd,
        seed: String(Math.floor(Math.random() * 1e9)),
      })}`,
    );
  }

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#trip-form">
        Lewati ke formulir
      </a>

      <header className={styles.header}>
        <div className={`${styles.shell} ${styles.headerInner}`}>
          <Brand />

          <Link
            className={styles.loginButton}
            href="/login"
            aria-label="Masuk atau daftar"
          >
            <AccountIcon />
            <span className={styles.loginLabelDesktop} aria-hidden="true">
              Masuk / Daftar
            </span>
            <span className={styles.loginLabelMobile} aria-hidden="true">
              Masuk
            </span>
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.ambientTop} aria-hidden="true" />
        <div className={styles.ambientLeft} aria-hidden="true" />
        <div className={styles.ambientRight} aria-hidden="true" />

        <div className={`${styles.shell} ${styles.mainShell}`}>
          <section className={styles.hero} aria-labelledby="page-title">
            {isOnline ? (
              <p className={styles.aiBadge}>
                <SparkleIcon />
                <span>AI itinerary planner · Terintegrasi Google Maps</span>
              </p>
            ) : (
              <p
                className={`${styles.aiBadge} ${styles.offlineBadge}`}
                role="status"
              >
                <span>Offline · form tetap bisa diisi</span>
              </p>
            )}

            <h1 className={styles.title} id="page-title">
              <span className={styles.titleDesktop}>
                Mau liburan tapi males bikin rute?{" "}
                <span className={styles.titleBreak}>
                  Biarkan AI yang bantu kamu.
                </span>
              </span>
              <span className={styles.titleMobile}>
                Males bikin rute?{" "}
                <span className={styles.titleBreakMobile}>
                  Biarkan AI bantu.
                </span>
              </span>
            </h1>
          </section>

          <section
            className={styles.formSection}
            id="trip-form"
            aria-label="Form rencana perjalanan"
          >
            <div className={styles.formCard}>
              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.primaryFields}>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label
                        className={`${styles.label} ${styles.labelWithIcon}`}
                        htmlFor="city"
                      >
                        <LocationIcon />
                        Kota tujuan
                      </label>
                    </div>

                    <DestinationCombobox
                      inputRef={cityRef}
                      value={city}
                      onChange={typeCity}
                      onSelect={selectDestination}
                      isOnline={isOnline}
                      invalid={Boolean(errors.city)}
                      describedBy={errors.city ? "city-error" : undefined}
                    />

                    <div className={styles.suggestions}>
                      <span className={styles.suggestionLabel}>
                        Cepat:
                      </span>
                      {QUICK_DESTINATIONS.map((option) => (
                        <button
                          key={option.id}
                          className={styles.suggestionChip}
                          type="button"
                          onClick={() => selectDestination(option)}
                        >
                          <LocationIcon />
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {errors.city && (
                      <p className={styles.error} id="city-error">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <span
                        className={`${styles.label} ${styles.labelWithIcon}`}
                        id="date-range-label"
                      >
                        <CalendarIcon />
                        Tanggal perjalanan
                      </span>
                    </div>

                    <button
                      ref={dateButtonRef}
                      className={`${styles.input} ${styles.dateTrigger}`}
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={isCalendarOpen}
                      aria-labelledby="date-range-label travel-range-value"
                      data-invalid={Boolean(errors.dates)}
                      aria-describedby={
                        errors.dates
                          ? "dates-error"
                          : rangeLabel
                            ? undefined
                            : "date-hint"
                      }
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <span
                        id="travel-range-value"
                        className={
                          rangeLabel ? undefined : styles.datePlaceholder
                        }
                      >
                        {rangeLabel || "Pilih rentang tanggal"}
                      </span>
                      <CalendarIcon />
                    </button>

                    {!errors.dates && !rangeLabel && (
                      <p className={styles.hint} id="date-hint">
                        Hari ini atau setelahnya.
                      </p>
                    )}

                    {errors.dates && (
                      <p className={styles.error} id="dates-error">
                        {errors.dates}
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className={styles.submitButton} type="submit">
                    <ExploreIcon />
                    <span>Buat Rencana</span>
                  </button>

                  {status && (
                    <p
                      className={`${styles.status} ${
                        status.tone === "error" ? styles.statusError : ""
                      }`}
                      role="status"
                    >
                      {status.message}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter className={styles.mainFooter} />

      {isCalendarOpen && (
        <DateRangePicker
          start={travelStart}
          end={travelEnd}
          onApply={applyDateRange}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}
    </div>
  );
}
