async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  await Promise.resolve();

  {
    const user = { name: "Ada" };
    console.log(user.name);
  }
}

void printUser(undefined);
