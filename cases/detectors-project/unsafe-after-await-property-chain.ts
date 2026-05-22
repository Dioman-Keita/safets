async function printUser(user: { profile: { name: string } } | undefined) {
  if (!user) return;
  await Promise.resolve();
  console.log(user.profile.name);
}

void printUser(undefined);
