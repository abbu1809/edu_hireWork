import { serviceDb } from "../../config/supabase.js";
import { escapeFilter } from "../../utils/normalize.js";
import { EmailService } from "./email.service.js";

const MAX_RECIPIENTS = 2000;

/**
 * Emails teachers whose subject matches a newly published vacancy, if they
 * have job alerts on and an active profile. Runs in the background.
 */
export const JobAlertService = {
  async notifyMatchingTeachers(vacancy) {
    if (!vacancy || vacancy.status !== "Active" || !vacancy.subject) return 0;
    const subject = escapeFilter(vacancy.subject);
    if (!subject) return 0;

    const { data: teachers, error } = await serviceDb
      .from("teachers")
      .select("id, name, email")
      .eq("profile_status", "Active")
      .or("job_alerts_enabled.is.null,job_alerts_enabled.eq.true")
      .or(`primary_subject.ilike.%${subject}%,subjects.cs.{${subject}}`)
      .limit(MAX_RECIPIENTS);
    if (error) {
      console.warn("[email] job alert lookup failed:", error.message);
      return 0;
    }

    const recipients = (teachers || []).filter((t) => t.email);
    recipients.forEach((t) => EmailService.background(EmailService.send(t.email, "jobAlert", { name: t.name, vacancy })));
    return recipients.length;
  },
};
