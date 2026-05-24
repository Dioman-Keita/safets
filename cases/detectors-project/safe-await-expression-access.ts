async function printUser(user: { getName(): Promise<string> } | undefined) {
  if (!user) return;

  await user.getName();
}

void printUser(undefined);
