async function printCount(count: number) {
  if (!count) return;
  await Promise.resolve();
  console.log(count.toFixed(2));
}

void printCount(1);
