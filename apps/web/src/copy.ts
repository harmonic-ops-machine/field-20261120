document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const id = button.dataset.copy;
    const node = id ? document.getElementById(id) : null;
    if (!node) return;
    await navigator.clipboard.writeText(node.innerText.trim());
    const previous = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1600);
  });
});
