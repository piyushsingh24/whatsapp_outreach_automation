import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { bulkCreateContactSchema } from "@/validators/contact";
import { createManualContactsForUser } from "@/services/contact/contact.service";

/** POST /api/contacts/bulk — manually add up to 100 contacts (single + paste flow). */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = bulkCreateContactSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid contacts data", parsed.error.flatten());
    const result = await createManualContactsForUser(userId, parsed.data.contacts);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
