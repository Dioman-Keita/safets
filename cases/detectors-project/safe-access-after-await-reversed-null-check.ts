async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  if (null === user) return;
  console.log(user.name);
}

void printUser(undefined);
