import styles from "./auth.module.css";

/** Atribut aksesibilitas untuk input yang punya pesan error di bawahnya (`<name>-error`). */
export const errorProps = (errors: Record<string, string>, name: string, hintId?: string) => ({
  "aria-invalid": errors[name] ? true : undefined,
  "aria-describedby": [errors[name] && `${name}-error`, hintId].filter(Boolean).join(" ") || undefined,
});

export function FieldError({ errors, name }: { errors: Record<string, string>; name: string }) {
  return errors[name] ? (
    <p className={styles.fieldError} id={`${name}-error`}>
      {errors[name]}
    </p>
  ) : null;
}
