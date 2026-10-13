import { Image, type ColorValue } from "react-native";

/** Shared robot mark; the full brand name is typeset by each header. */
export function PiedPiperWordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  return (
    <Image
      source={require("../../../../assets/brand/pied-piper-robot.png")}
      accessibilityLabel="Pied Piper"
      resizeMode="contain"
      style={{ height: props.height, width: props.height }}
    />
  );
}
