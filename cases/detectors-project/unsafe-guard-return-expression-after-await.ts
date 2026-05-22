async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  if (!user) return user.name;
  console.log(user.name);
}

void printUser(undefined);
