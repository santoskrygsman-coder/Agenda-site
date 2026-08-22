"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciais inválidas");
    } else {
      router.push("/admin");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-pink-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-pink-100 p-8 text-center">
          <div className="w-16 h-16 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white shadow-md">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Acesso Restrito</h1>
          <p className="text-pink-600 text-sm mt-1">Painel Administrativo da Designer</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input 
              required 
              type="text" 
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              required 
              type="password" 
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-pink-600 text-white font-bold text-lg p-4 rounded-xl mt-4 hover:bg-pink-700 transition-colors"
          >
            ENTRAR NO PAINEL
          </button>
        </form>
      </div>
    </main>
  );
}
