async function printUser(user: { name: string } | undefined) {
  function nested() {
    if (!user) return;
  }

  await Promise.resolve();
  console.log("outer complete");
  nested();
}

void printUser(undefined);
