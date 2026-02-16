import { notifier } from "./notifier";
import { setupConfigurationElements } from "./setup-configuration-elements";
import { setupMainSettingsElements } from "./setup-main-settings-elements";

/**
 * Binds UI to StateManager. Should be called once on application startup.
 */
function setupElements() {
  // main display settings
  setupMainSettingsElements();

  // config
  setupConfigurationElements();

  // notifier
  setupNotifier();

}





function setupNotifier(){
  const notificationContainer = document.getElementById(
    "notification-container",
  ) as HTMLElement;
  notifier.setNotificationContainer(notificationContainer);
}





export { setupElements };
