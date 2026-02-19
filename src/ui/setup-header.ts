import { StateManager } from "../state-manager"

function setupHeaderElements() {
  setupAppLanguageSelect()
}

function setupAppLanguageSelect() {
  const select = document.getElementById("app-language") as HTMLSelectElement
  const app = StateManager.getInstance()
  select.addEventListener("change", () => {
    app.setAppLanguage(select.value)
  })

}

export {
    setupHeaderElements
}