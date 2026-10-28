import { useArchiveEntity, useFeatureEntity, useVerifyEntity } from "./useAdmin";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { notify } from "@/shared/utils/notify";

const nameOf = (row) => row.name || row.institute_name || "this profile";

/**
 * Moderation actions for teachers or institutes. Negative actions open a
 * confirmation modal; rejections collect a reason that is emailed to the user.
 */
export const useEntityActions = (entity) => {
  const verify = useVerifyEntity();
  const feature = useFeatureEntity();
  const archive = useArchiveEntity();
  const confirm = useConfirm();
  const noun = entity === "teachers" ? "Teacher" : "Institute";

  return {
    pending: verify.isPending || feature.isPending || archive.isPending,

    /** `defaultReason` pre-fills the reason box (e.g. for revoking a verified profile). */
    setVerification: async (row, status, defaultReason) => {
      let reason;
      if (status === "Rejected") {
        const revoking = Boolean(row.verified) || row.verification_status === "Verified";
        const result = await confirm({
          title: revoking ? `Revoke verification for ${nameOf(row)}?` : `Reject ${nameOf(row)}?`,
          message: revoking
            ? "The Verified badge will be removed and the profile taken off the homepage. The reason below is emailed to them."
            : "They'll be notified by email and in-app so they can fix their documents and resubmit.",
          confirmLabel: revoking ? "Revoke verification" : "Reject",
          tone: "danger",
          input: {
            label: "Reason (shared with the user)",
            placeholder: "e.g. ID proof is blurry — please upload a clear scan of your Aadhaar or PAN.",
            defaultValue: defaultReason && !/revoked by admin/i.test(defaultReason) ? defaultReason : "",
            required: true,
            minLength: 5,
            requiredMessage: "Please give a short reason (at least 5 characters).",
          },
        });
        if (!result) return;
        reason = result.value;
      }

      verify.mutate(
        { entity, id: row.id, status, reason },
        {
          onSuccess: () => notify[status === "Verified" ? "success" : "info"](`${noun} status changed to ${status}.`),
          onError: (error) => notify.apiError(error, "Verification action failed."),
        }
      );
    },

    toggleFeature: (row) =>
      feature.mutate(
        { entity, id: row.id, feature: !row.featured_on_homepage },
        {
          onSuccess: () =>
            notify.success(row.featured_on_homepage ? `${noun} removed from Homepage featured list.` : `${noun} is now featured on Homepage!`),
          onError: (error) => notify.apiError(error, "Only verified profiles can be featured."),
        }
      ),

    toggleArchive: async (row, isArchived) => {
      if (!isArchived) {
        const ok = await confirm({
          title: `Archive ${nameOf(row)}?`,
          message: `The ${noun.toLowerCase()} will be hidden from public listings and the homepage. Their account and data are kept, and you can restore them anytime.`,
          confirmLabel: "Archive",
          tone: "danger",
        });
        if (!ok) return;
      }
      archive.mutate(
        { entity, id: row.id, archive: !isArchived },
        {
          onSuccess: () => notify.info(isArchived ? `${noun} profile restored to Active.` : `${noun} profile archived.`),
          onError: (error) => notify.apiError(error, "Archive action failed."),
        }
      );
    },
  };
};
