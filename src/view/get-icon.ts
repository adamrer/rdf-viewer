/**
 * Creates an HTML image element for an SVG icon
 * @param iconName name of the SVG icon file in assets folder
 * @returns an HTML image element of the svg
 */
function getIcon(iconName: string): HTMLImageElement {
  const icon = document.createElement("img");
  icon.src = `../../assets/icons/${iconName}.svg`;
  icon.className = "icon";
  return icon;
}
export { getIcon };
