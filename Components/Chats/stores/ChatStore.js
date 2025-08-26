import axiosInstance from "../../TokenHandling/axiosInstance";

// ✅ Group create
export const axiosPostCreateGroup = async (newGroup) => {
  try {
    const res = await axiosInstance.post("/chat/group/create/", newGroup);
    return res.data;
  } catch (error) {
    console.error("'/chat/group/create/' post error:", error.response?.data || error.message);
  }
};

// ✅ All groups
export const axiosGetAllGroup = async () => {
  try {
    const res = await axiosInstance.get("/chat/messages/all-groups/");
    return res.data;
  } catch (error) {
    console.error("/chat/messages/all-groups/ error:", error.response?.data || error.message);
  }
};

// ✅ Group messages
export const axiosGetGroupMsg = async (group_id) => {
  try {
    const res = await axiosInstance.get(`/chat/messages/group/${group_id}/`);
    return res.data;
  } catch (error) {
    console.error(`chat/messages/group/${group_id}/ error:`, error.response?.data || error.message);
  }
};

// ✅ Send msg
export const axiosPostSendMsg = async (newMsg) => {
  try {
    const res = await axiosInstance.post("/chat/message/send/", newMsg);
    return res.data;
  } catch (error) {
    console.error("/chat/message/send/ error:", error.response?.data || error.message);
  }
};

// ✅ User status
export const axiosGetUserStatus = async (userId) => {
  try {
    const res = await axiosInstance.post(`/chat/messages/users/${userId}/status/`);
    return res.data;
  } catch (error) {
    console.error(`/chat/messages/users/${userId}/status/ error:`, error.response?.data || error.message);
  }
};

// ✅ Delete msg
export const axiosDeleteMsg = async (messageId) => {
  try {
    const res = await axiosInstance.delete(`/chat/messages/delete/${messageId}/`);
    return res.data;
  } catch (error) {
    console.error(`/chat/messages/delete/${messageId}/ error:`, error.response?.data || error.message);
  }
};
