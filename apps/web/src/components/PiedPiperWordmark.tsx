import type { SVGProps } from "react";
import fluteMark from "../../../../assets/brand/pied-piper-indigo.png";

export function PiedPiperWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} data-brand-mark="" viewBox="0 0 1280 1280" xmlns="http://www.w3.org/2000/svg">
      <image href={fluteMark} width="1280" height="1280" />
    </svg>
  );
}
