import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import CertificatesForm from "./form";

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !(await userHasPermission(user.roleId, PERMISSIONS.PATIENTS_READ))) redirect("/dashboard");
  return <CertificatesForm />;
}
