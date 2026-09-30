import { useParams } from "react-router";

// Placeholder until Phase 1 (docs/TASKS.md). Real overlays live in src/overlays/<name>/.
export default function OverlayPlaceholder() {
  const { overlay } = useParams();
  return (
    <div style={{ width: 1920, height: 1080, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      Overlay: {overlay}
    </div>
  );
}
