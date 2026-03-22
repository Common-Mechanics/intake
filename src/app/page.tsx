import { redirect } from "next/navigation";

/* Root redirects to admin — there's no public landing page */
export default function Home() {
  redirect("/admin");
}
