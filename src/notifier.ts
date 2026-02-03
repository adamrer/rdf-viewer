const notificationContainer = document.getElementById(
  "notification-container",
)! as HTMLElement;

/**
 * Type of the notification
 */
type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Service for showing notifications to the user
 */
interface NotifierService {
  /**
   * 
   * @param message - Text content of the notification
   * @param type - Type of the notification
   * @param duration - Duration in milliseconds for which the notification is shown
   */
  notify(message: string, type: NotificationType, duration: number): void;

  /**
   * 
   * @param promise - Promise to be tracked
   * @param messages - Messages to be shown for different states of the promise
   */
  notifyPromise<T>(
    promise: Promise<T>,
    messages: { pending: string; success: string; error: string },
  ): Promise<T>;
}


/**
 * Implementation of the NotifierService interface
 */
class NotifierServiceImpl implements NotifierService {

  notify(message: string, type: NotificationType) {
    if (!notificationContainer)
      throw new Error("Notification container not found");

    const div = document.createElement("div");
    div.className = `notification ${type}`;
    div.textContent = `${this.getEmoji(type)} ${message}`;

    notificationContainer.appendChild(div);

    setTimeout(() => {
      div.remove();
    }, 5000);
  }

  async notifyPromise<T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
  ): Promise<T> {
    if (!notificationContainer)
      throw new Error("Notification container not found");

    const div = document.createElement("div");
    div.className = "notification info";
    div.textContent = messages.pending;
    notificationContainer.appendChild(div);

    try {
      const res = await promise;
      div.textContent = `${this.getEmoji("success")} ${messages.success}`;
      div.className = "notification success";
      setTimeout(() => div.remove(), 4000);
      return res;
    } catch (err) {
      div.textContent = `${this.getEmoji("error")} ${messages.error}`;
      div.className = "notification error";
      setTimeout(() => div.remove(), 6000);
      throw err;
    }
  }
  getEmoji(type: NotificationType): string {
    switch (type) {
      case "info":
        return "🛈";
      case "success":
        return "✔️";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
    }
  }
}

const notifier = new NotifierServiceImpl();

export type { NotificationType, NotifierService };
export { notifier };
