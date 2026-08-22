"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export function ForgotPasswordForm() {
    const { t } = useLanguage();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset link");
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">{'Checkyouremail'}</CardTitle>
          <CardDescription className="text-zinc-400">
            {'Wevesentapasswo'}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="ghost" className="w-full text-zinc-400 hover:text-white" onClick={() => (window.location.href = "/login")}>
            {'Backtologin'}</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-white">{'Forgotpassword'}</CardTitle>
        <CardDescription className="text-zinc-400">
          {'Enteryouremailt'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">{'Email'}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@company.com"
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:ring-primary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full bg-primary hover:bg-primary/90 text-white" type="submit" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {'Send Reset Link'}</Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button variant="link" className="w-full text-zinc-400 hover:text-white" onClick={() => (window.location.href = "/login")}>
          {'Backtologin'}</Button>
      </CardFooter>
    </Card>
  );
}
