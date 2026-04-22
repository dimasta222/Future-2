import { LOGO_FULL_SRC } from "./logoFullSrc";

export default function LogoFull() {
  return (
    <img
      src={LOGO_FULL_SRC}
      alt="Future Studio"
      draggable={false}
      style={{
        width: "100%",
        maxWidth: 700,
        height: "auto",
        pointerEvents: "none",
        userSelect: "none",
        WebkitUserDrag: "none",
      }}
    />
  );
}
