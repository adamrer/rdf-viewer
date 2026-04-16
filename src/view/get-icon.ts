import binIcon from "../../assets/icons/bin-icon.svg";
import infoIcon from "../../assets/icons/info-icon.svg";
import settingsIcon from "../../assets/icons/settings-icon.svg";
import successIcon from "../../assets/icons/success-icon.svg";

enum iconType {
  bin,
  info,
  settings,
  success,
}

/**
 * Creates an HTML image element for an SVG icon
 * @param iconName name of the SVG icon file in assets folder
 * @returns an HTML image element of the svg
 */
function getIcon(iconName: iconType): HTMLImageElement {
  let iconSrc = "";
  switch (iconName) {
    case iconType.bin:
      iconSrc = binIcon;
      break;
    case iconType.info:
      iconSrc = infoIcon;
      break;
    case iconType.settings:
      iconSrc = settingsIcon;
      break;
    case iconType.success:
      iconSrc = successIcon;
      break;
    default:
      break;
  }
  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.className = "icon";
  return icon;
}
export { getIcon, iconType };
