"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createComparisonRequest, deleteComparison } from "@/lib/comparisons";

export interface CompareFormState {
  error?: string;
}

export async function requestComparison(
  _prev: CompareFormState,
  formData: FormData
): Promise<CompareFormState> {
  const url = String(formData.get("url") ?? "");
  const note = String(formData.get("note") ?? "");

  let id: string;
  try {
    id = (await createComparisonRequest(url, note)).id;
  } catch {
    return { error: "Enter a valid http(s) link." };
  }

  revalidatePath("/compare");
  redirect(`/compare/${id}`);
}

export async function removeComparison(id: string) {
  await deleteComparison(id);
  revalidatePath("/compare");
  redirect("/compare");
}
