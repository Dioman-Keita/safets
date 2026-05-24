async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  user = user.name as unknown as { name: string };
  console.log(user.name);
}

void printUser(undefined);
