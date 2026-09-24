export function getSession() {
  return Promise.resolve({
    authenticated: false,
    permissions: [],
  });
}

export function logoutProfessional() {
  return Promise.resolve();
}
