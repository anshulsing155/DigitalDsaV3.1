// download.js
import { writable } from "svelte/store";

export const progress = writable(0); // `const`, not `let`, since writable is not reassigned

export async function downloadPdf(loanName) {
  progress.set(0);
  await animateProgress(10);
  await animateProgress(30);
  await animateProgress(50);

  const res = await fetch(
    `/api/generated-pdf?pageData=${encodeURIComponent(loanName)}`
  );
  await animateProgress(60);

  const blob = await res.blob();
  await animateProgress(90);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${loanName}-Guide.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  await animateProgress(100);
  if (
    progress.subscribe((value) => {
      value == 100;
    })
  ) {
    setTimeout(()=>{
        progress.set(0)
    },1000)
  }
}

async function animateProgress(target) {
  return new Promise((resolve) => {
    let current;
    const unsubscribe = progress.subscribe((value) => (current = value));

    const step = () => {
      if (current < target) {
        current += 1;
        progress.set(current);
        setTimeout(step, 20);
      } else {
        unsubscribe(); // Always clean up subscriptions
        resolve();
      }
    };

    step();
  });
}
