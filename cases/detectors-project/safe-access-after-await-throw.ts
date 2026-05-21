async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  if (!user) {
    throw new Error("missing user");
  }
  console.log(user.name);
}

void printUser(undefined);
