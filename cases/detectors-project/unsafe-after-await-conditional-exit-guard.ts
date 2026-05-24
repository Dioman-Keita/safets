async function printUser(user: { name: string } | undefined, debug: boolean) {
  if (!user) return;
  await Promise.resolve();
  if (!user) {
    if (debug) return;
  }
  console.log(user.name);
}

void printUser(undefined, false);
