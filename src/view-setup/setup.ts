import { RdfViewerState } from "../core/rdf-viewer-state";
import { notifier } from "../view/notifier";
import { setupConfigurationElements } from "./setup-configuration-elements";
import { setupHeaderElements } from "./setup-header";
import { setupMainSettingsElements } from "./setup-main-settings-elements";
import { withLoading } from "../view/spinner";

/**
 * Setups all elements in UI. Adding event listeners and subscribers to RdfViewerState
 * Should be called once on application startup.
 * @see RdfViewerState
 */
function setupElements() {
  loadStateConfiguration();

  // header
  setupHeaderElements();

  // main display settings
  setupMainSettingsElements();

  // configuration
  setupConfigurationElements();

  // notifier
  setupNotifier();
}

/**
 * Setups the notifier
 */
function setupNotifier() {
  const notificationContainer = document.getElementById(
    "notification-container",
  ) as HTMLElement;
  notifier.setNotificationContainer(notificationContainer);
}

/**
 * Loads the state from configuration to the RdfViewerState and shows loading spinner
 * next to the plugin select element
 */
function loadStateConfiguration() {
  const pluginSelectEl = document.getElementById(
    "choose-plugin",
  ) as HTMLSelectElement;

  withLoading(pluginSelectEl, async () =>
    RdfViewerState.getInstance().loadConfiguration(),
  );
}

export { setupElements };
