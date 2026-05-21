type User = { name: string } | undefined;

const user: User = undefined;
console.log(user!.name);
