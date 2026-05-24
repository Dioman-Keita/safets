async function printUser(user: { name: string } | undefined) {
  if (!user) return;

  (() => {
    user = undefined;
  })();

  await Promise.resolve();
  console.log(user.name);
}

void printUser(undefined);
