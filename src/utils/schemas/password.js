export function isValidSignupPassword(value) {
  const password = String(value ?? '');
  return (
    password.length >= 8
    && /[a-zA-Z]/.test(password)
    && /\d/.test(password)
  );
}

export function passwordsMatch(password, confirmPassword) {
  return String(password ?? '').length > 0 && password === confirmPassword;
}
