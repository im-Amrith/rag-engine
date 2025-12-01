"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackgroundPaths from "@/components/BackgroundPaths";
import { getApiUrl } from "@/utils/api";
import Link from "next/link";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Eye,
    EyeOff,
    Github,
    Lock,
    Mail,
    ArrowRight,
    Chrome,
} from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(getApiUrl("/api/login"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                throw new Error("Invalid credentials");
            }

            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            router.push("/");
        } catch (err) {
            setError("Login failed. Please check your credentials.");
        }
    };

    return (
        <section className="fixed inset-0 bg-zinc-950 text-zinc-50 overflow-hidden">
            <BackgroundPaths />

            <div className="h-full w-full grid place-items-center px-4 relative z-10">
                <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-zinc-400">Welcome back</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Sign in to your account
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-5">
                        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}

                        <form onSubmit={handleLogin} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-zinc-300">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-zinc-300">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-400 hover:text-zinc-200"
                                        onClick={() => setShowPassword((v) => !v)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900"
                                    />
                                    <Label htmlFor="remember" className="text-zinc-400">
                                        Remember me
                                    </Label>
                                </div>
                                <a href="#" className="text-sm text-zinc-300 hover:text-zinc-100">
                                    Forgot password?
                                </a>
                            </div>

                            <Button type="submit" className="w-full h-10 rounded-lg bg-zinc-50 text-zinc-900 hover:bg-zinc-200">
                                Continue
                            </Button>
                        </form>

                        <div className="relative">
                            <Separator className="bg-zinc-800" />
                            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-zinc-900/70 px-2 text-[11px] uppercase tracking-widest text-zinc-500">
                                or
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-10 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 hover:bg-zinc-900/80"
                                onClick={() => window.location.href = getApiUrl("/api/auth/login/github")}
                            >
                                <Github className="h-4 w-4 mr-2" />
                                GitHub
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 hover:bg-zinc-900/80"
                                onClick={() => window.location.href = getApiUrl("/api/auth/login/google")}
                            >
                                <Chrome className="h-4 w-4 mr-2" />
                                Google
                            </Button>
                        </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-center text-sm text-zinc-400">
                        Don’t have an account?
                        <Link className="ml-1 text-zinc-200 hover:underline" href="/signup">
                            Create one
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </section>
    );
}
