import type { SVGProps } from "react";
import robotMark from "../../../../assets/brand/pied-piper-robot.png";

export function PiedPiperWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 1280 1280" xmlns="http://www.w3.org/2000/svg">
      <image href={robotMark} width="1280" height="1280" />
    </svg>
  );
}
