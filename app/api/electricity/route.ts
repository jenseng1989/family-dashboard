import { getElectricityPrices } from "@/lib/electricity";

export async function GET() {
  try {
    const data = await getElectricityPrices("SE3");

    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Kunde inte hämta elpriser" },
      { status: 500 }
    );
  }
}