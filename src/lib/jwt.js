// Decodes the JWT payload client-side to read the subject (user id) without a /users/me call.
export function decodeJwtPayload(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function currentUserIdFromToken(token) {
  return decodeJwtPayload(token)?.sub ?? null
}
