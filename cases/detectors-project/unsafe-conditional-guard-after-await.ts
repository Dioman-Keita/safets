async function printUser(user: { name: string } | undefined, shouldCheck: boolean) {
  if (!user) return;
  await Promise.resolve();
  if (shouldCheck) {
    if (!user) return;
  }
  console.log(user.name);
}

void printUser(undefined, false);
