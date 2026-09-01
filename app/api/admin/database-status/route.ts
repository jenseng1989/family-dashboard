import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const { count, error } = await supabase
      .from("family_members")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      console.error(
        "Supabase hälsokontroll misslyckades:",
        error
      );

      return NextResponse.json(
        {
          status: "error",
          provider: "Supabase",
          table: "family_members",
          error:
            error.message ||
            "Databasen kunde inte läsas.",
          responseTime:
            Date.now() - startedAt,
          checkedAt:
            new Date().toISOString(),
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      status: "healthy",
      provider: "Supabase",
      table: "family_members",
      records: count ?? 0,
      responseTime:
        Date.now() - startedAt,
      checkedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Oväntat fel vid Supabase hälsokontroll:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        provider: "Supabase",
        table: "family_members",
        error:
          error instanceof Error
            ? error.message
            : "Ett okänt databasfel inträffade.",
        responseTime:
          Date.now() - startedAt,
        checkedAt:
          new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}