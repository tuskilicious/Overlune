import { useEffect, useState } from "react";

/** The part you're reading, for a page's index (T8.2, T8.3): the last of these headings above 40% of the window. */
export function useHeadingAbove(ids: readonly string[]) {
  const [current, setCurrent] = useState<string>(ids[0]!);
  useEffect(() => {
    const update = () => {
      let found = ids[0]!;
      for (const id of ids)
        if (
          (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <
          innerHeight * 0.4
        )
          found = id;
      setCurrent(found);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, [ids]);
  return current;
}
