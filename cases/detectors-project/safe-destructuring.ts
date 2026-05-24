type User = { name: string } | undefined;

function printUser(user: User) {
  if (!user) return;
  const { name } = user;
  console.log(name);
}

printUser(undefined);
