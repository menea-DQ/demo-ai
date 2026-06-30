import { redirect } from "next/navigation";

// /wiki senza slug → galleria (home). La wiki vive in /wiki/<slug>.
export default function WikiIndex() {
  redirect("/");
}
