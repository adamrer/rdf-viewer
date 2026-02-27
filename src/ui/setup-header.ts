import { RdfViewerState } from "../rdf-viewer-state"

function setupHeaderElements() {
  setupAppLanguageSelect()
}

function setupAppLanguageSelect() {
  const select = document.getElementById("app-language") as HTMLSelectElement
  const app = RdfViewerState.getInstance()
  select.addEventListener("change", () => {
    app.setAppLanguage(select.value)
  })

}

export {
    setupHeaderElements
}