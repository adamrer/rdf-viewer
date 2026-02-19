import { notifier } from "../notifier";
import { setupConfigurationElements } from "./setup-configuration-elements";
import { setupHeaderElements } from "./setup-header";
import { setupMainSettingsElements } from "./setup-main-settings-elements";

/**
 * Setups all elements in UI. Adding event listeners and subscribers to StateManager 
 * Should be called once on application startup.
 * @see StateManager
 */
function setupElements() {
  
  // header
  setupHeaderElements();
  
  // main display settings
  setupMainSettingsElements();

  // config
  setupConfigurationElements();

  // notifier
  setupNotifier();

}


/**
 * Setups the notifier
 */
function setupNotifier(){
  const notificationContainer = document.getElementById(
    "notification-container",
  ) as HTMLElement;
  notifier.setNotificationContainer(notificationContainer);
}


export { setupElements };
