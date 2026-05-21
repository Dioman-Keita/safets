type User = { name: string } | undefined;

function printUser(user: User) {
  if (!user) return;
  console.log(user.name);
}

printUser(undefined);
