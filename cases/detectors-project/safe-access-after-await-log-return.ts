async function printUser(user: { name: string } | undefined) {
  if (!user) return;
  await Promise.resolve();
  if (!user) {
    console.log("missing user");
    return;
  }
  console.log(user.name);
}

void printUser(undefined);
