import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { InterviewModel } from "../models/interview.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { NotificationService } from "../services/notification.service.js";
import { EmailService } from "../services/email/email.service.js";

export const InterviewController = {
  listMine: asyncHandler(async (req, res) => {
    const list =
      req.user.role === "institute"
        ? await InterviewModel.listByInstitute(req.db, req.user.id)
        : await InterviewModel.listByTeacher(req.db, req.user.id);
    res.json({ success: true, data: list });
  }),

  /** Institute schedules a demo lecture for one of its applicants. */
  schedule: asyncHandler(async (req, res) => {
    const { applicationId, date, time, topic, meetingLink, notes } = req.body;
    if (!applicationId || !date || !topic) throw ApiError.badRequest("Please enter the demo date and topic.");

    const application = await ApplicationModel.findById(req.db, applicationId);
    if (!application || application.institute_id !== req.user.id) throw ApiError.notFound("Application not found.");

    // The browser sends scheduledAt in ISO form so the teacher's local time is preserved.
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date(`${date}T${time || "00:00"}`);
    if (Number.isNaN(scheduledAt.getTime())) throw ApiError.badRequest("Please enter a valid demo date and time.");

    const interview = await InterviewModel.create(req.db, {
      application_id: application.id,
      institute_id: req.user.id,
      teacher_id: application.teacher_id,
      scheduled_at: scheduledAt.toISOString(),
      topic: String(topic).trim(),
      meeting_link: meetingLink ? String(meetingLink).trim() : null,
      notes: notes ? String(notes).trim() : null,
      status: "SCHEDULED",
    });

    await ApplicationModel.update(req.db, application.id, {
      status: "INTERVIEW",
      interview_date: date,
      interview_time: time || null,
      interview_link: meetingLink || null,
    });

    await NotificationService.notify({
      userId: application.teacher_id,
      title: "Demo Lecture Scheduled",
      message: `${application.institute_name} scheduled a demo for "${application.vacancy_title}" on ${date}${time ? ` at ${time}` : ""}.`,
      type: "INTERVIEW",
      link: "/teacher/interviews",
    });
    EmailService.background(
      EmailService.sendToUser(
        application.teacher_id,
        "interviewScheduled",
        {
          instituteName: application.institute_name,
          vacancyTitle: application.vacancy_title,
          when: scheduledAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST",
          topic: interview.topic,
          meetingLink: interview.meeting_link,
          notes: interview.notes,
        },
        { preference: "interview_notifications_enabled" }
      )
    );

    res.status(201).json({ success: true, data: interview });
  }),
};
