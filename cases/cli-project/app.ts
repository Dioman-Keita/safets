type User = { profile: { name: string } } | undefined;

const user: User = undefined;
console.log(user.profile.name);
