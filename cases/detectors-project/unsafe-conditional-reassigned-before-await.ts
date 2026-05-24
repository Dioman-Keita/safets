async function printUser(
  user: { name: string } | undefined,
  shouldReset: boolean,
) {
  if (!user) return;

  if (shouldReset) {
    user = undefined;
  }

  await Promise.resolve();
  console.log(user.name);
}

void printUser(undefined, true);
