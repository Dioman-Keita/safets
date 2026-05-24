async function printUser(user: { name: string } | undefined, shouldAwait: boolean) {
  if (!user) return;
  if (shouldAwait) {
    await Promise.resolve();
  }
  console.log(user.name);
}

void printUser(undefined, true);
