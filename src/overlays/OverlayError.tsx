import "./overlay-error.css";

interface Props {
  title?: string;
  message?: string;
}

/** Readable, static error card in theme colors. The containing overlay decides where it sits. */
export default function OverlayError({
  title = "This overlay link has a problem",
  message = "Some settings couldn’t be read, so defaults are showing. Open Overlune and copy a fresh “Link to paste into OBS”.",
}: Props) {
  return (
    <div className="overlay-error" role="status">
      <strong className="overlay-error-title">{title}</strong>
      <p className="overlay-error-message">{message}</p>
    </div>
  );
}
