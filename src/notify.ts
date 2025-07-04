type NotificationType = "info" | "success" | "warning" | "error";

function getEmoji(type: NotificationType): string {
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

function notify(message: string, type: NotificationType) {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const output = document.createElement("output");
  output.className = `notification ${type}`;
  output.textContent = `${getEmoji(type)} ${message}`;

  container.appendChild(output);

  setTimeout(() => {
    output.remove();
  }, 5000);
}

export type { NotificationType };
export { notify };
