import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const ThemedPath = withUniwind(Path);

/**
 * The "Pied Piper" brand mark, matching the desktop sidebar's PiedPiperWordmark SVG
 * (apps/web Sidebar.tsx). Width derives from the viewBox aspect ratio.
 */
export function PiedPiperWordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  const aspectRatio = 42 / 34;
  return (
    <Svg
      accessibilityLabel="Pied Piper"
      height={props.height}
      width={props.height * aspectRatio}
      viewBox="0 0 42 34"
    >
      <ThemedPath
        d="M4 28V5H12C23 5 23 19 12 19H10V28ZM10 11V13H12C15 13 15 11 12 11ZM23 28V5H31C42 5 42 19 31 19H29V28ZM29 11V13H31C34 13 34 11 31 11Z"
        fillRule="evenodd"
        color={props.color}
        colorClassName={props.colorClassName}
        fill="currentColor"
      />
    </Svg>
  );
}
