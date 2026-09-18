"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="card-chunky overflow-hidden">
          <div className="franja-marca h-[7px]">
            <div className="bg-azul" />
            <div className="bg-rosa" />
            <div className="bg-amarillo" />
          </div>

          <div className="p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-2xl border-[3px] border-navy overflow-hidden">
                <Image
                  src="/logo-peliando.png"
                  alt="Peliando"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <h1 className="text-xl font-black uppercase tracking-wide">CRM Peliando</h1>
              <p className="text-sm text-navy/60 font-medium">
                Ingresá con tu cuenta del equipo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-chunky"
                  placeholder="nombre@peliando.com"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
                  Contraseña
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-chunky"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <p className="text-sm font-bold text-rosa" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
