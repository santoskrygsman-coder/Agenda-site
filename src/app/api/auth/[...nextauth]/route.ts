import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuário", type: "text", placeholder: "admin" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials, req) {
        if (credentials?.username === "admin" && credentials?.password === "admin123") {
          return { id: "1", name: "Designer", email: "admin@admin.com" }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: "/login"
  }
})

export { handler as GET, handler as POST }
