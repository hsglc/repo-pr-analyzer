import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByEmail, createUser } from "@/lib/db";

const RegisterSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = RegisterSchema.parse(body);

    const existing = await findUserByEmail(email);
    if (existing) {
      // Return same shape but without id to prevent auto-login
      return NextResponse.json(
        { message: "İşlem başarılı. Lütfen giriş yapın." },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(email, passwordHash);

    return NextResponse.json(
      { id: user.id, message: "İşlem başarılı. Lütfen giriş yapın." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Kayıt sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
