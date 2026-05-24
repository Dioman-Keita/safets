async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  console.log(user.name);
}

void printUser(undefined);
