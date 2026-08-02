export const hasAccess = (user, allowedRoles) => {
  if (!user) return false;
  return allowedRoles.includes(user.role.toUpperCase());
};
