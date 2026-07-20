export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  picture: string | null
}

export interface AuthTokenPayload {
  sub: string
  email: string
  name?: string | null
  picture?: string | null
}
