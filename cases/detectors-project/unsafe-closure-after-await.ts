async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  (() => user.name)();
}

void printUser(undefined);
