const TOKEN_KEY = "lapabg_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "Что-то пошло не так";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function uploadImage(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    let detail = "Не удалось загрузить фото";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  return res.json();
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  telegramAuth: (data) => request("/auth/telegram", { method: "POST", body: data }),
  me: () => request("/auth/me", { auth: true }),
  changePassword: (data) => request("/auth/password", { method: "PATCH", body: data, auth: true }),
  deleteAccount: (password) => request("/auth/me", { method: "DELETE", body: { password }, auth: true }),

  user: (id) => request(`/users/${id}`),

  posts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? `?${qs}` : ""}`);
  },
  createPost: (data) => request("/posts", { method: "POST", body: data, auth: true }),
  post: (id) => request(`/posts/${id}`),
  resolvePost: (id) => request(`/posts/${id}/resolve`, { method: "PATCH", auth: true }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE", auth: true }),
  savePost: (id) => request(`/posts/${id}/save`, { method: "POST", auth: true }),
  unsavePost: (id) => request(`/posts/${id}/save`, { method: "DELETE", auth: true }),
  savedPosts: () => request("/posts/saved", { auth: true }),
  reportPost: (id, reason) => request(`/posts/${id}/report`, { method: "POST", body: { reason }, auth: true }),
  comments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: "POST", body, auth: true }),

  myPets: () => request("/pets/mine", { auth: true }),
  petsOfUser: (userId) => request(`/pets/user/${userId}`),
  pets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/pets${qs ? `?${qs}` : ""}`);
  },
  pet: (id) => request(`/pets/${id}`),
  createPet: (data) => request("/pets", { method: "POST", body: data, auth: true }),
  deletePet: (id) => request(`/pets/${id}`, { method: "DELETE", auth: true }),

  services: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/services${qs ? `?${qs}` : ""}`);
  },
  becomeProvider: (data) => request("/services", { method: "POST", body: data, auth: true }),
  providerReviews: (id) => request(`/services/${id}/reviews`),
  reviewProvider: (id, data) => request(`/services/${id}/reviews`, { method: "POST", body: data, auth: true }),

  follow: (userId) => request(`/follows/${userId}`, { method: "POST", auth: true }),
  unfollow: (userId) => request(`/follows/${userId}`, { method: "DELETE", auth: true }),
  followers: (userId) => request(`/follows/${userId}/followers`),

  notifications: () => request("/notifications", { auth: true }),
  unreadNotificationsCount: () => request("/notifications/unread-count", { auth: true }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PATCH", auth: true }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH", auth: true }),

  adminOverview: () => request("/admin/overview", { auth: true }),
  adminReports: (resolved) => request(`/admin/reports${resolved !== undefined ? `?resolved=${resolved}` : ""}`, { auth: true }),
  adminDismissReport: (id) => request(`/admin/reports/${id}/dismiss`, { method: "PATCH", auth: true }),
  adminDeletePost: (id) => request(`/admin/posts/${id}`, { method: "DELETE", auth: true }),
  adminAuditLog: () => request("/admin/audit-log", { auth: true }),

  communities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/communities${qs ? `?${qs}` : ""}`, { auth: true });
  },
  community: (id) => request(`/communities/${id}`, { auth: true }),
  createCommunity: (data) => request("/communities", { method: "POST", body: data, auth: true }),
  joinCommunity: (id) => request(`/communities/${id}/join`, { method: "POST", auth: true }),
  leaveCommunity: (id) => request(`/communities/${id}/leave`, { method: "DELETE", auth: true }),
  communityMembers: (id) => request(`/communities/${id}/members`),

  conversations: () => request("/messages/conversations", { auth: true }),
  messageThread: (userId) => request(`/messages/${userId}`, { auth: true }),
  sendMessage: (userId, body) => request(`/messages/${userId}`, { method: "POST", body: { body }, auth: true }),
  unreadMessagesCount: () => request("/messages/unread-count", { auth: true }),

  events: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ""}`, { auth: true });
  },
  event: (id) => request(`/events/${id}`, { auth: true }),
  createEvent: (data) => request("/events", { method: "POST", body: data, auth: true }),
  joinEvent: (id) => request(`/events/${id}/join`, { method: "POST", auth: true }),
  leaveEvent: (id) => request(`/events/${id}/leave`, { method: "DELETE", auth: true }),
  eventParticipants: (id) => request(`/events/${id}/participants`),

  listings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/marketplace${qs ? `?${qs}` : ""}`, { auth: true });
  },
  listing: (id) => request(`/marketplace/${id}`, { auth: true }),
  createListing: (data) => request("/marketplace", { method: "POST", body: data, auth: true }),
  markListingSold: (id) => request(`/marketplace/${id}/mark-sold`, { method: "PATCH", auth: true }),
  deleteListing: (id) => request(`/marketplace/${id}`, { method: "DELETE", auth: true }),
  saveListing: (id) => request(`/marketplace/${id}/save`, { method: "POST", auth: true }),
  unsaveListing: (id) => request(`/marketplace/${id}/save`, { method: "DELETE", auth: true }),
  savedListings: () => request("/marketplace/saved", { auth: true }),

  petHealth: (petId) => request(`/pets/${petId}/health`, { auth: true }),
  addHealthRecord: (petId, data) => request(`/pets/${petId}/health`, { method: "POST", body: data, auth: true }),
  deleteHealthRecord: (petId, recordId) => request(`/pets/${petId}/health/${recordId}`, { method: "DELETE", auth: true }),

  uploadImage,
};
