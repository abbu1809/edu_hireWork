import { useSelector } from "react-redux";
import { selectAuthReady, selectCurrentUser, selectIsSubmitting, selectUserRole } from "../store/authSlice";

/** Current session as the UI needs it. */
export const useAuth = () => {
  const currentUser = useSelector(selectCurrentUser);
  const authReady = useSelector(selectAuthReady);
  const isSubmitting = useSelector(selectIsSubmitting);
  const role = useSelector(selectUserRole);
  return { currentUser, role, authReady, authLoading: !authReady, isSubmitting };
};
