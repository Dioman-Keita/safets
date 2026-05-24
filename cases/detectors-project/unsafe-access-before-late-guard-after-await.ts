async function printUser(user: { name: string } | undefined) {
  await Promise.resolve();
  console.log(user.name);

  if (!user) return;
}

void printUser(undefined);
