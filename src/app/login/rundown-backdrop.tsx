import Image from "next/image";
import { MOCK_RUNDOWN } from "../rundown/mock-rundown";
import styles from "./login.module.css";

type Card = {
  name: string;
  photo?: string;
};

const day = MOCK_RUNDOWN[0];

const CARDS: Card[] = [
  {
    name: day.startMarker.place,
    photo: day.startMarker.photo,
  },
  ...day.stops.map((stop) => ({
    name: stop.name,
    photo: stop.photo,
  })),
  { name: day.finishMarker.place },
];

// Naik-turun bergantian supaya jalur terlihat berkelok; arah kurva mengikuti.
const OFFSETS = [2.5, -3, 2.25, -2.5, 1, 2.5];

function CardSet({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className={styles.set} aria-hidden={ariaHidden || undefined}>
      {CARDS.map((card, index) => {
        const next = OFFSETS[(index + 1) % OFFSETS.length];
        const path =
          next === OFFSETS[index]
            ? "M0 60H160"
            : next < OFFSETS[index]
              ? "M0 100C60 100 100 20 160 20"
              : "M0 20C60 20 100 100 160 100";
        return (
          <div className={styles.segment} key={card.name}>
            <article
              className={styles.stopCard}
              style={{ translate: `0 ${OFFSETS[index]}rem` }}
            >
              <div className={styles.stopPhoto}>
                {card.photo && (
                  <Image src={card.photo} alt="" fill sizes="320px" />
                )}
                <span className={styles.stopChip}>Titik {index + 1}</span>
              </div>
            </article>

            <div className={styles.link}>
              <svg viewBox="0 0 160 120" fill="none" overflow="visible">
                <path className={styles.routeBase} d={path} />
                <path className={styles.routeDash} d={path} />
                <circle className={styles.routeDot} cx="80" cy="60" r="4" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RundownBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.conveyor}>
        <CardSet />
        <CardSet ariaHidden />
      </div>
    </div>
  );
}
