import { redirect } from "next/navigation";
import { GenerativeImageStudio } from "@/components/GenerativeImageStudio";
import { isAuthenticated } from "@/lib/auth";

export default async function Home() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <GenerativeImageStudio />;
}
