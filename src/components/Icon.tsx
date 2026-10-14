/** The site's line icons (T6.118; Lucide since 2.1, from 21st.dev's components). Decorative: the words next to them
 *  carry the meaning. */
import { createElement } from "react";
import { lucide } from "./lucide";
import "./icon.css";

export type IconName = keyof typeof lucide;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {lucide[name].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
