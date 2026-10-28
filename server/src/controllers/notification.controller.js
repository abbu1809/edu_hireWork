import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { NotificationModel } from "../models/notification.model.js";

export const NotificationController = {
  listMine: asyncHandler(async (req, res) => {
    const list = await NotificationModel.listByUser(req.db, req.user.id);
    res.json({ success: true, data: list, meta: { unread: list.filter((n) => !n.read).length } });
  }),

  markRead: asyncHandler(async (req, res) => {
    const notification = await NotificationModel.markRead(req.db, req.user.id, req.params.id);
    if (!notification) throw ApiError.notFound("Notification not found.");
    res.json({ success: true, data: notification });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await NotificationModel.markAllRead(req.db, req.user.id);
    res.json({ success: true });
  }),
};
