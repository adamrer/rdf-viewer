function createSpinner(size = 20): HTMLElement {
  const el = document.createElement("div");
  el.className = "spinner";
  el.style.setProperty("--spinner-size", `${size}px`);
  return el;
}

async function withLoading(
  container: HTMLElement,
  task: () => Promise<void>
) {
  const spinner = createSpinner();
  container.after(spinner)

  try {
    await task();
  } finally {
    spinner.remove();
  }
}

export {
    withLoading,
    createSpinner
}