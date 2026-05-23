async function printUser(user: { name: string } | undefined, debug: boolean) {
  if (!user) {
    if (debug) return;
  }

  await Promise.resolve();
  console.log(user.name);
}

void printUser(undefined, false);
